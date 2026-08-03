import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const userId = (session?.user as any)?.id;
        const userRole = (session?.user as any)?.role;

        // Only Admins can modify names
        if (!userId || userRole !== Role.ADMIN) {
            return new NextResponse('Unauthorized', { status: 403 });
        }

        const { name } = await req.json();

        await prisma.user.update({
            where: { id: userId },
            data: { name },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating name:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
