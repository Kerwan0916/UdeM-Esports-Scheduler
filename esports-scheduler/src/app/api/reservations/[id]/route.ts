// src/app/api/reservations/[id]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const me = session?.user as any;
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (me.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const id = params.id;

  // Ensure it exists (gives 404 instead of silent success)
  const existing = await prisma.reservation.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.reservation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
