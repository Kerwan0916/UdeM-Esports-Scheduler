import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // or '../../../lib/prisma' if you didn't set the @ alias

// Optional: set in .env -> NEXT_PUBLIC_DEFAULT_USER_EMAIL=admin@example.com
const TARGET_EMAIL = process.env.NEXT_PUBLIC_DEFAULT_USER_EMAIL ?? 'admin@example.com';

export async function GET() {
  const user =
    (await prisma.user.findUnique({ where: { email: TARGET_EMAIL } })) ??
    (await prisma.user.findFirst());

  if (!user) {
    return NextResponse.json({ error: 'No users found' }, { status: 404 });
  }
  return NextResponse.json({ id: user.id, email: user.email, name: user.name, role: user.role });
}
