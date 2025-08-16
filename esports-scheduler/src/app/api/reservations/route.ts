import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/* ---------- GET: list reservations (optionally filter by time/PC) ---------- */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const compId = searchParams.get('computerId');
  const start  = searchParams.get('start');
  const end    = searchParams.get('end');

  const where: any = {};
  if (compId) where.computerId = Number(compId);
  if (start && end) {
    where.startsAt = { lt: new Date(end) };
    where.endsAt   = { gt: new Date(start) };
  }

  const reservations = await prisma.reservation.findMany({
    where,
    include: { computer: true, team: true },
    orderBy: { startsAt: 'asc' },
  });

  return NextResponse.json(reservations);
}

/* ---------- POST: create 1..N reservations (multi-PC) ---------- */
export async function POST(req: Request) {
  const body = (await req.json()) as {
    teamId?: string;
    computerId?: number;        // legacy (single)
    computerIds?: number[];     // new (multiple)
    startsAt?: string;
    endsAt?: string;
    createdByUserId?: string;
  };

  const start = body.startsAt ? new Date(body.startsAt) : null;
  const end   = body.endsAt   ? new Date(body.endsAt)   : null;

  // normalize to an array of computer IDs
  const compIds =
    Array.isArray(body.computerIds)
      ? body.computerIds.map(Number).filter(Number.isFinite)
      : body.computerId != null
        ? [Number(body.computerId)]
        : [];

  if (!body.teamId || !body.createdByUserId || !start || !end || !(start < end) || compIds.length === 0) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  // FK & activity checks
  const [user, team, comps] = await Promise.all([
    prisma.user.findUnique({ where: { id: body.createdByUserId } }),
    prisma.team.findUnique({ where: { id: body.teamId } }),
    prisma.computer.findMany({ where: { id: { in: compIds }, isActive: true } }),
  ]);
  if (!user) return NextResponse.json({ error: 'createdByUserId does not exist' }, { status: 400 });
  if (!team) return NextResponse.json({ error: 'teamId does not exist' }, { status: 400 });
  if (comps.length !== compIds.length) {
    const found = new Set(comps.map(c => c.id));
    const missing = compIds.filter(id => !found.has(id));
    return NextResponse.json({ error: `Invalid or inactive computerId(s): ${missing.join(', ')}` }, { status: 400 });
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      // blackout guard
      const blackout = await tx.blackout.findFirst({
        where: {
          startsAt: { lt: end },
          endsAt:   { gt: start },
          OR: [{ scope: 'ALL' }, { scope: 'COMPUTER', computerId: { in: compIds } }],
        },
      });
      if (blackout) throw new Error('Time is blocked by a blackout window');

      // conflict guard
      const conflicts = await tx.reservation.findMany({
        where: {
          computerId: { in: compIds },
          status: 'CONFIRMED',
          startsAt: { lt: end },
          endsAt:   { gt: start },
        },
        include: { computer: true },
      });
      if (conflicts.length) {
        const pcs = Array.from(new Set(conflicts.map(c => c.computer?.label ?? String(c.computerId)))).join(', ');
        throw new Error(`Already reserved for: ${pcs}`);
      }

      // create one row per computer
      return Promise.all(
        compIds.map((cid) =>
          tx.reservation.create({
            data: {
              teamId: body.teamId!,
              computerId: cid,
              startsAt: start!,
              endsAt: end!,
              createdByUserId: body.createdByUserId!,
              status: 'CONFIRMED',
            },
          })
        )
      );
    });

    return NextResponse.json({ created }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Failed to create reservations' }, { status: 409 });
  }
}
