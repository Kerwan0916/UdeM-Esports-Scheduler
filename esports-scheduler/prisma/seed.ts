import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // 1) Seed an admin user
  const user = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin',
      role: 'ADMIN', // adjust if your schema doesn't have role
    },
  });

  // 2) Seed a sample team
  const team = await prisma.team.upsert({
    where: { id: 'seed-team-valorant-a' },  // any stable string id
    update: {},
    create: {
      name: 'Valorant A',
      gameTitle: 'Valorant',
    },
  });

  // 3) Seed 15 computers
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

  console.log('Seeded admin user:', user.id);
  console.log('Seeded team:', team.id);
  console.log('Seeded 15 computers.');
}

main().finally(() => prisma.$disconnect());
