import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!(session?.user as any)?.godmode) {
            return new NextResponse('Unauthorized', { status: 403 });
        }

        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
            },
            orderBy: {
                email: 'asc',
            }
        });

        return NextResponse.json(users);
    } catch (error) {
        console.error('Error fetching users for godmode:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
