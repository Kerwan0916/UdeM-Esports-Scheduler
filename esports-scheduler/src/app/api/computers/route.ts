import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const computers = await prisma.computer.findMany({
    select: { id: true, label: true, isActive: true },
    orderBy: { id: 'asc' },
  });
  return NextResponse.json(computers);
}
