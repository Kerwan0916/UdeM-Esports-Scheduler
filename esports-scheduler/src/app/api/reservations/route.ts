// src/app/api/reservations/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { randomUUID } from 'crypto';
import { pgPool } from '@/lib/pg';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CHANNEL = 'reservation_events';

async function notify(
  type: 'reservation.created' | 'reservation.updated' | 'reservation.deleted',
  payload: object
) {
  try {
    // Use pg_notify with parameters (safe & reliable)
    await pgPool.query('SELECT pg_notify($1::text, $2::text)', [
      CHANNEL,
      JSON.stringify({ type, ...payload }),
    ]);
  } catch {
    // don't block the request on a notify failure
  }
}

/* ---------- GET: list reservations (optionally filter by time/PC) ---------- */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const grouped = searchParams.get('grouped') === '1';
  const compId  = searchParams.get('computerId');
  const start   = searchParams.get('start');
  const end     = searchParams.get('end');

  const where: any = {};
  if (compId) where.computerId = Number(compId);
  if (start && end) {
    where.startsAt = { lt: new Date(end) };
    where.endsAt   = { gt: new Date(start) };
  }

  const rows = await prisma.reservation.findMany({
    where,
    include: {
      computer: true,
      team: true,
      createdBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { startsAt: 'asc' },
  });

  if (!grouped) return NextResponse.json(rows);

  // group by groupId (or fallback key for legacy rows)
  const map = new Map<string, any>();
  for (const r of rows) {
    const key =
      r.groupId ??
      `${r.teamId}|${r.startsAt.toISOString()}|${r.endsAt.toISOString()}|${r.createdByUserId}`;

    let g = map.get(key);
    if (!g) {
      g = {
        id: key,
        teamId: r.teamId,
        startsAt: r.startsAt,
        endsAt: r.endsAt,
        team: r.team ? { name: r.team.name } : undefined,
        computers: [] as { id: number; label: string }[],
        createdBy: r.createdBy
          ? { id: r.createdBy.id, name: r.createdBy.name, email: r.createdBy.email }
          : undefined,
      };
      map.set(key, g);
    }
    g.computers.push({ id: r.computerId, label: r.computer?.label ?? String(r.computerId) });

    if (!g.createdBy && r.createdBy) {
      g.createdBy = { id: r.createdBy.id, name: r.createdBy.name, email: r.createdBy.email };
    }
  }

  return NextResponse.json(Array.from(map.values()));
}

/* ---------- POST: create 1..N reservations (multi-PC) ---------- */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as any;
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { id: sessionUser.id } });
  if (!dbUser) {
    return NextResponse.json(
      { error: 'Your session is out of date. Please sign out and sign back in.' },
      { status: 401 }
    );
  }

  const createdByUserId = dbUser.id;
  if (sessionUser.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as {
    teamId?: string;
    computerId?: number;
    computerIds?: number[];
    startsAt?: string;
    endsAt?: string;
  };

  const start = body.startsAt ? new Date(body.startsAt) : null;
  const end   = body.endsAt   ? new Date(body.endsAt)   : null;

  const compIds =
    Array.isArray(body.computerIds)
      ? body.computerIds.map(Number).filter(Number.isFinite)
      : body.computerId != null
        ? [Number(body.computerId)]
        : [];

  if (!body.teamId || !start || !end || !(start < end) || compIds.length === 0) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const [team, comps] = await Promise.all([
    prisma.team.findUnique({ where: { id: body.teamId } }),
    prisma.computer.findMany({ where: { id: { in: compIds }, isActive: true } }),
  ]);
  if (!team) return NextResponse.json({ error: 'teamId does not exist' }, { status: 400 });
  if (comps.length !== compIds.length) {
    const found = new Set(comps.map(c => c.id));
    const missing = compIds.filter(id => !found.has(id));
    return NextResponse.json({ error: `Invalid or inactive computerId(s): ${missing.join(', ')}` }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const blackout = await tx.blackout.findFirst({
        where: {
          startsAt: { lt: end },
          endsAt:   { gt: start },
          OR: [{ scope: 'ALL' }, { scope: 'COMPUTER', computerId: { in: compIds } }],
        },
      });
      if (blackout) throw new Error('Time is blocked by a blackout window');

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

      const groupId = randomUUID();

      const created = await Promise.all(
        compIds.map((cid) =>
          tx.reservation.create({
            data: {
              groupId,
              teamId: body.teamId!,
              computerId: cid,
              startsAt: start!,
              endsAt: end!,
              createdByUserId,
              status: 'CONFIRMED',
            },
          })
        )
      );

      return { groupId, createdCount: created.length, created };
    });

    await notify('reservation.created', { groupId: result.groupId });
    return NextResponse.json(result, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Failed to create reservations' }, { status: 409 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as any;
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (sessionUser.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get('groupId');
  if (!groupId) return NextResponse.json({ error: 'groupId is required' }, { status: 400 });

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (groupId.includes('|')) {
        const [teamId, startsAtISO, endsAtISO, createdByUserId] = groupId.split('|');
        if (!teamId || !startsAtISO || !endsAtISO || !createdByUserId) {
          throw new Error('Invalid legacy group key');
        }
        const del = await tx.reservation.deleteMany({
          where: {
            groupId: null,
            teamId,
            createdByUserId,
            startsAt: new Date(startsAtISO),
            endsAt: new Date(endsAtISO),
          },
        });
        return { deletedCount: del.count, mode: 'legacy' };
      }

      const del = await tx.reservation.deleteMany({ where: { groupId } });
      return { deletedCount: del.count, mode: 'groupId' };
    });

    await notify('reservation.deleted', { groupId });
    return NextResponse.json(result, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Failed to delete reservations' }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as any;
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (sessionUser.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as {
    groupId?: string;
    legacyKey?: { teamId: string; startsAt: string; endsAt: string; createdByUserId: string };
    teamId?: string;
    computerIds?: number[];
    startsAt?: string;
    endsAt?: string;
  };

  let targetWhere: any;
  if (body.groupId) {
    targetWhere = { groupId: body.groupId };
  } else if (body.legacyKey) {
    const { teamId, startsAt, endsAt, createdByUserId } = body.legacyKey;
    targetWhere = {
      groupId: null,
      teamId,
      createdByUserId,
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
    };
  } else {
    return NextResponse.json({ error: 'groupId or legacyKey is required' }, { status: 400 });
  }

  const start = body.startsAt ? new Date(body.startsAt) : null;
  const end   = body.endsAt   ? new Date(body.endsAt)   : null;
  if (!body.teamId || !Array.isArray(body.computerIds) || body.computerIds.length === 0 || !start || !end || !(start < end)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
  const compIds = body.computerIds.map(Number).filter(Number.isFinite);

  const existing = await prisma.reservation.findMany({ where: targetWhere });
  if (existing.length === 0) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

  const originalGroupId = existing[0].groupId;
  const createdByUserId = existing[0].createdByUserId;

  const [team, comps] = await Promise.all([
    prisma.team.findUnique({ where: { id: body.teamId } }),
    prisma.computer.findMany({ where: { id: { in: compIds }, isActive: true } }),
  ]);
  if (!team) return NextResponse.json({ error: 'teamId does not exist' }, { status: 400 });
  if (comps.length !== compIds.length) {
    const found = new Set(comps.map(c => c.id));
    const missing = compIds.filter(id => !found.has(id));
    return NextResponse.json({ error: `Invalid or inactive computerId(s): ${missing.join(', ')}` }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const conflicts = await tx.reservation.findMany({
        where: {
          computerId: { in: compIds },
          status: 'CONFIRMED',
          startsAt: { lt: end },
          endsAt:   { gt: start },
          NOT: originalGroupId ? { groupId: originalGroupId } : targetWhere,
        },
        include: { computer: true },
      });
      if (conflicts.length) {
        const pcs = Array.from(new Set(conflicts.map(c => c.computer?.label ?? String(c.computerId)))).join(', ');
        throw new Error(`Already reserved for: ${pcs}`);
      }

      await tx.reservation.deleteMany({ where: targetWhere });

      const groupId = originalGroupId ?? randomUUID();
      const created = await Promise.all(
        compIds.map((cid) =>
          tx.reservation.create({
            data: {
              groupId,
              teamId: body.teamId!,
              computerId: cid,
              startsAt: start!,
              endsAt: end!,
              createdByUserId,
              status: 'CONFIRMED',
            },
          })
        )
      );
      return { groupId, createdCount: created.length };
    });

    await notify('reservation.updated', { groupId: result.groupId });
    return NextResponse.json(result, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Failed to update reservations' }, { status: 409 });
  }
}
