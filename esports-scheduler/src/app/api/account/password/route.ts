import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | null)?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { currentPassword, newPassword } = (body as Record<string, unknown>) || {};
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.passwordHash) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });

  return NextResponse.json({ ok: true });
}
