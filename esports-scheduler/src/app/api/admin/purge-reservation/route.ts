// Purge reservations older than the current month
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function startOfCurrentMonthUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function GET(req: Request) {
  // allow both header and query param for secrets
  const url = new URL(req.url);
  const qSecret = url.searchParams.get('secret');
  const hSecret = req.headers.get('x-cron-secret');
  if ((qSecret ?? hSecret) !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // dry-run? -> just count
  const dryRun = url.searchParams.get('dryRun') === '1';
  const cutoff = startOfCurrentMonthUTC();

  if (dryRun) {
    const wouldDelete = await prisma.reservation.count({
      where: { endsAt: { lt: cutoff } },
    });
    return NextResponse.json({ dryRun: true, cutoff, wouldDelete });
  }

  const result = await prisma.reservation.deleteMany({
    where: { endsAt: { lt: cutoff } },
  });

  return NextResponse.json({ cutoff, deleted: result.count });
}

// Optional POST doing the same (useful for manual triggers)
export const POST = GET;
