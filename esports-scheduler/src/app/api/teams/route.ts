import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const teams = await prisma.team.findMany({
    select: { id: true, name: true, gameTitle: true },
    orderBy: [{ gameTitle: 'asc' }, { name: 'asc' }]
  });
  return NextResponse.json(teams);
}
