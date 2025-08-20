// src/app/api/reservations/[id]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { pgPool } from '@/lib/pg'; // ← added: for pg_notify

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CHANNEL = 'reservation_events'; // ← added: channel your SSE route LISTENs on

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const me = session?.user as any; // keep as-is to avoid touching your typings
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (me.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const id = params.id;

  // Ensure it exists (gives 404 instead of silent success)
  const existing = await prisma.reservation.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Delete
  await prisma.reservation.delete({ where: { id } });

  // ← added: notify listeners (non-blocking; ignore errors)
  try {
    const payload = JSON.stringify({ type: 'reservation.deleted', id });
    await pgPool.query('select pg_notify($1, $2)', [CHANNEL, payload]);
  } catch (err) {
    // Don't fail the API if notify fails; just log for debugging
    console.error('pg_notify(reservation.deleted) failed', err);
  }

  return NextResponse.json({ ok: true });
}
