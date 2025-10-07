// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export const runtime = 'nodejs';       // Prisma/bcrypt need Node
export const dynamic = 'force-dynamic';

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
