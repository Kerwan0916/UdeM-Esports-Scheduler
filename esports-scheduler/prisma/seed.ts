import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // 1) Admin user (id/email can be whatever you already use)
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: { email: 'admin@example.com', name: 'Admin', role: 'ADMIN' },
  });

  // 2) Computers 1..15
  const labels = Array.from({ length: 15 }, (_, i) => `PC-${String(i + 1).padStart(2, '0')}`);
  await Promise.all(
    labels.map(label =>
      prisma.computer.upsert({
        where: { label },
        update: {},
        create: { label, isActive: true },
      })
    )
  );

  // 3) Teams: A & B for each game (use fixed ids so upsert always works)
  const games = ['Valorant', 'League of Legends', 'Rocket League', 'Overwatch', 'CS2'] as const;
  const letters = ['A', 'B'] as const;
  const teams = games.flatMap(game =>
    letters.map(letter => ({
      id: `team-${game.toLowerCase().replace(/\s+/g, '-')}-${letter.toLowerCase()}`,
      name: `${game} ${letter}`,
      gameTitle: game,
    }))
  );

  for (const t of teams) {
    await prisma.team.upsert({
      where: { id: t.id },    // use fixed id to avoid needing a unique constraint on name
      update: {},
      create: t,
    });
  }

  console.log('Seed complete: admin, 15 computers, A/B teams for 5 games.');
}

main().finally(() => prisma.$disconnect());
