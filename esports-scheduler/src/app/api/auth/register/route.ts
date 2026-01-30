import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Using your existing Prisma client
import bcrypt from 'bcryptjs'; // reusing the lib from your seed.ts

export async function POST(req: Request) {
    try {
        const { name, email, password } = await req.json();

        if (!email || !password || !name) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        // 1. Check for duplicate email
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
        }

        // 2. Hash Password (using 12 rounds, matching your seed.ts)
        const passwordHash = await bcrypt.hash(password, 12);

        // 3. Create User
        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                passwordHash,
                role: 'PLAYER', // Default role
            },
        });

        return NextResponse.json({ success: true, userId: newUser.id });
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}