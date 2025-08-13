import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET all reservations
export async function GET() {
  const reservations = await prisma.reservation.findMany({
    include: { computer: true, team: true },
    orderBy: { startsAt: 'asc' },
  });
  return NextResponse.json(reservations);
}

type CreateReservationBody = {
  teamId: string;
  computerId: number;
  startsAt: string; // ISO datetime
  endsAt: string;   // ISO datetime
  createdByUserId: string;
};

// POST new reservation
export async function POST(req: Request) {
  const body = (await req.json()) as CreateReservationBody;

  const start = new Date(body.startsAt);
  const end = new Date(body.endsAt);

  if (!body.teamId || !body.computerId || !body.createdByUserId || !(start < end)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Blackout check
      const blackout = await tx.blackout.findFirst({
        where: {
          startsAt: { lt: end },
          endsAt: { gt: start },
          OR: [{ scope: 'ALL' }, { scope: 'COMPUTER', computerId: body.computerId }],
        },
      });
      if (blackout) throw new Error('Time is blocked by a blackout window');

      // Conflict check
      const conflict = await tx.reservation.findFirst({
        where: {
          computerId: body.computerId,
          status: 'CONFIRMED',
          startsAt: { lt: end },
          endsAt: { gt: start },
        },
      });
      if (conflict) throw new Error('Computer already reserved in that time range');

      return tx.reservation.create({
        data: {
          teamId: body.teamId,
          computerId: body.computerId,
          startsAt: start,
          endsAt: end,
          createdByUserId: body.createdByUserId,
        },
      });
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to create reservation' }, { status: 409 });
  }
}
