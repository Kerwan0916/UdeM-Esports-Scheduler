import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!(session?.user as any)?.godmode) {
            return new NextResponse('Unauthorized', { status: 403 });
        }

        const { userId } = await req.json();
        if (!userId) {
            return new NextResponse('Bad Request: Missing userId', { status: 400 });
        }

        const newPassword = 'udemesports2026';
        const passwordHash = await bcrypt.hash(newPassword, 10);

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { passwordHash },
            select: { id: true, email: true },
        });

        return NextResponse.json({ success: true, message: `Password reset for ${updatedUser.email}` });
    } catch (error) {
        console.error('Error resetting password:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
