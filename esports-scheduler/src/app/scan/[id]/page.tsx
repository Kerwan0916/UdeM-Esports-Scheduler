import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export default async function ScanHandlerPage({ params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);

    // 1. AUTH GUARD
    // FIX: Redirect to "/signin" instead of "/", so they actually see the login form.
    if (!session || !session.user) {
        // We encode the current scan URL so we can send them back here after login
        const callbackUrl = `/scan/${params.id}`;
        redirect(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }

    const userId = (session.user as any).id;

    // 2. REMOVED VALIDATION
    // We deleted the "parseInt" and "isNaN" checks. 
    // Now it accepts "toggle", "entry", "door", or anything else.

    try {
        // 3. CHECK STATUS (Punch Clock Logic)
        // Find if the user has an open session (checkOut is null)
        const activeLog = await prisma.presenceLog.findFirst({
            where: {
                userId: userId,
                checkOut: null,
            },
        });

        if (activeLog) {
            // --- USER IS ALREADY IN -> CHECK THEM OUT ---
            const now = new Date();

            // Auto-fix: If session is older than 12 hours, close it and start fresh
            const hoursActive = (now.getTime() - activeLog.checkIn.getTime()) / (1000 * 60 * 60);

            if (hoursActive > 12) {
                // Close stale session
                await prisma.presenceLog.update({
                    where: { id: activeLog.id },
                    data: { checkOut: now },
                });

                // Open new session
                await prisma.presenceLog.create({
                    data: {
                        userId: userId,
                        checkIn: now,
                    },
                });

                redirect('/status/welcome?msg=fixed_stale');
            } else {
                // Normal Checkout
                await prisma.presenceLog.update({
                    where: { id: activeLog.id },
                    data: { checkOut: now },
                });

                redirect('/status/goodbye');
            }
        } else {
            // --- USER IS CURRENTLY OUT -> CHECK THEM IN ---
            await prisma.presenceLog.create({
                data: {
                    userId: userId,
                    checkIn: new Date(),
                },
            });

            redirect('/status/welcome');
        }

    } catch (error) {
        // Allow the redirect to happen (Next.js throws this error intentionally)
        if ((error as any)?.digest?.startsWith('NEXT_REDIRECT')) {
            throw error;
        }

        console.error("Scan error:", error);
        return (
            <div className="flex h-screen items-center justify-center p-6 text-center">
                <div>
                    <h1 className="text-xl font-bold text-red-600">System Error</h1>
                    <p className="text-gray-500">Please try scanning again.</p>
                </div>
            </div>
        );
    }
}