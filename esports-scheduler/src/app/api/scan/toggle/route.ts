// app/api/scan/toggle/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma'; // Make sure this path matches your project
// import { authOptions } from '@/lib/auth'; // UNCOMMENT if you export authOptions

export async function GET(req: Request) {
    // 1. Get the session (pass authOptions if your setup requires it)
    const session = await getServerSession();

    // 2. Enforce Authentication
    // If they aren't logged in, redirect them to sign-in, then bring them back here.
    if (!session || !session.user?.email) {
        const callbackUrl = encodeURIComponent('/api/scan/toggle');
        return NextResponse.redirect(new URL(`/api/auth/signin?callbackUrl=${callbackUrl}`, req.url));
    }

    // 3. Find the User in the Database
    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: {
            presenceLogs: {
                where: { checkOut: null }, // Only look for currently open sessions
                orderBy: { checkIn: 'desc' },
                take: 1,
            },
        },
    });

    if (!user) {
        return NextResponse.json({ error: "User account not found." }, { status: 404 });
    }

    const activeLog = user.presenceLogs[0]; // The most recent open session

    // --- LOGIC: CHECK IN vs. CHECK OUT ---

    if (activeLog) {
        // There IS an open session. Let's see how old it is.
        const now = new Date();
        const hoursOpen = (now.getTime() - new Date(activeLog.checkIn).getTime()) / (1000 * 60 * 60);

        if (hoursOpen > 16) {
            // CASE: Stale Session (They forgot to scan out yesterday)
            // Action: Close the old one, and start a NEW one for today.

            // Close the old one (approximating check-out time)
            await prisma.presenceLog.update({
                where: { id: activeLog.id },
                data: { checkOut: new Date(new Date(activeLog.checkIn).getTime() + 4 * 60 * 60 * 1000) } // auto-close after 4 hours
            });

            // Create FRESH check-in
            await prisma.presenceLog.create({
                data: { userId: user.id }
            });

            return NextResponse.redirect(new URL('/status/welcome?msg=fixed_stale', req.url));
        } else {
            // CASE: Normal Check Out
            // Action: Close the session.
            await prisma.presenceLog.update({
                where: { id: activeLog.id },
                data: { checkOut: new Date() }
            });

            return NextResponse.redirect(new URL('/status/goodbye', req.url));
        }
    } else {
        // CASE: Check In
        // There is no open session, so they are arriving.
        await prisma.presenceLog.create({
            data: { userId: user.id }
        });

        return NextResponse.redirect(new URL('/status/welcome', req.url));
    }
}