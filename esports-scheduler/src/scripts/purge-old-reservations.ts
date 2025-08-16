import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

function startOfCurrentMonthUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

async function main() {
  const cutoff = startOfCurrentMonthUTC();

  const count = await prisma.reservation.count({ where: { endsAt: { lt: cutoff } } });
  console.log(`[dry-run] would delete ${count} reservations older than ${cutoff.toISOString()}`);

  if (process.env.DRY_RUN === '0') {
    const res = await prisma.reservation.deleteMany({ where: { endsAt: { lt: cutoff } } });
    console.log(`[deleted] ${res.count} reservations`);
  } else {
    console.log('Set DRY_RUN=0 to actually delete.');
  }
}

main().finally(() => prisma.$disconnect());
