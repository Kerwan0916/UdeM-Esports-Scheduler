import type { NextAuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  // Use JWT sessions for Credentials provider
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      name: 'Admin Login',
      credentials: {
        email:    { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(creds) {
        if (!creds?.email || !creds.password) return null;

        // Select passwordHash + role explicitly
        const user = await prisma.user.findUnique({
          where: { email: creds.email },
          select: { id: true, email: true, name: true, role: true, passwordHash: true },
        });

        if (!user || user.role !== 'ADMIN' || !user.passwordHash) return null;

        const ok = await bcrypt.compare(creds.password, user.passwordHash);
        if (!ok) return null;

        // This object becomes `user` in the jwt callback below
        return { id: user.id, email: user.email, name: user.name ?? user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    // Put id/role into the JWT
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
      }
      return token;
    },
    // Expose id/role on the session.user
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  pages: { signIn: '/signin' },
  secret: process.env.AUTH_SECRET,
};
