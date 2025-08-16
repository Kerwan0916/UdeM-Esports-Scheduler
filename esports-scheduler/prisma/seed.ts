// prisma/seed.ts
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function upsertAdmin(email: string, name: string, plainPassword: string) {
  const passwordHash = await bcrypt.hash(plainPassword, 12);
  await prisma.user.upsert({
    where: { email },
    update: { role: Role.ADMIN, passwordHash },
    create: { email, name, role: Role.ADMIN, passwordHash },
  });
}

async function main() {
  // --- Admin users (CHANGE THESE PASSWORDS BEFORE USING IN PROD) ---
  await upsertAdmin('valadmin@udemesports', 'Valorant',   'ChangeMe#1');
  await upsertAdmin('loladmin@udemesports', 'League of Legends',   'ChangeMe#2');
  await upsertAdmin('overwatchadmin@udemesports', 'Overwatch', 'ChangeMe#3');
  await upsertAdmin('rladmin@udemesports', 'Rocket League',  'ChangeMe#4');
  await upsertAdmin('president@udemesports', 'President',  'ChangeMe#5');
  await upsertAdmin('scheduler@udemesports', 'Scheduler',  'ChangeMe#6');

  // --- Computers 1..15 ---
  const labels = Array.from({ length: 15 }, (_, i) => `PC-${String(i + 1).padStart(2, '0')}`);
  await Promise.all(
    labels.map((label) =>
      prisma.computer.upsert({
        where: { label },
        update: {},
        create: { label, isActive: true },
      })
    )
  );

  // --- Teams: A & B for each game ---
  const games = ['Valorant', 'League of Legends', 'Rocket League', 'Overwatch', 'CS2'] as const;
  const letters = ['A', 'B'] as const;

  const teams = games.flatMap((game) =>
    letters.map((letter) => ({
      id: `team-${game.toLowerCase().replace(/\s+/g, '-')}-${letter.toLowerCase()}`,
      name: `${game} ${letter}`,
      gameTitle: game,
    }))
  );

  for (const t of teams) {
    await prisma.team.upsert({
      where: { id: t.id }, // fixed ID keeps upserts idempotent
      update: {},
      create: t,
    });
  }

  console.log('Seed complete: 5 admins, 15 computers, A/B teams for 5 games.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
