import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export default async function ScanHandlerPage({ params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);

    // 1. AUTH GUARD
    if (!session || !session.user) {
        const callbackUrl = `/scan/${params.id}`;
        redirect(`/?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }

    const userId = (session.user as any).id;
    const computerId = parseInt(params.id, 10);

    // Validate ID format (security)
    if (isNaN(computerId)) {
        return (
            <div className="flex h-screen items-center justify-center p-6 text-center">
                <h1 className="text-xl font-bold text-red-600">Invalid QR Code</h1>
            </div>
        );
    }

    try {
        // 2. VALIDATION (Optional Security Check)
        // We check if the QR code is real, but we WON'T save this ID to the log.
        const computer = await prisma.computer.findUnique({
            where: { id: computerId },
        });

        if (!computer) {
            return (
                <div className="flex h-screen items-center justify-center p-6 text-center">
                    <h1 className="text-xl font-bold text-red-600">Invalid Station</h1>
                </div>
            );
        }

        // 3. CHECK STATUS (The "Punch Clock" Logic)
        const activeLog = await prisma.presenceLog.findFirst({
            where: {
                userId: userId,
                checkOut: null, // User is currently here
            },
        });

        // --- SCENARIO A: User is ALREADY Checked In ---
        if (activeLog) {
            const now = new Date();
            const hoursActive = (now.getTime() - activeLog.checkIn.getTime()) / (1000 * 60 * 60);

            // If session is > 12 hours, assume they forgot to checkout yesterday.
            // We close the old one, and START A NEW ONE (Auto-fix).
            if (hoursActive > 12) {
                // 1. Close old
                await prisma.presenceLog.update({
                    where: { id: activeLog.id },
                    data: { checkOut: now },
                });

                // 2. Open new (No computerId saved)
                await prisma.presenceLog.create({
                    data: {
                        userId: userId,
                        checkIn: now,
                        // computerId is removed!
                    },
                });

                redirect('/status/welcome?msg=fixed_stale');
            }

            // If session is normal (< 12 hours), they are leaving.
            // CHECK OUT.
            else {
                await prisma.presenceLog.update({
                    where: { id: activeLog.id },
                    data: { checkOut: now },
                });

                redirect('/status/goodbye');
            }
        }

        // --- SCENARIO B: User is NOT Checked In ---
        else {
            // CHECK IN
            await prisma.presenceLog.create({
                data: {
                    userId: userId,
                    checkIn: new Date(),
                    // computerId is removed!
                },
            });

            redirect('/status/welcome');
        }

    } catch (error) {
        // Next.js redirect() throws an error intentionally, we must re-throw it.
        if ((error as any)?.digest?.startsWith('NEXT_REDIRECT')) {
            throw error;
        }

        console.error("Scan error:", error);
        return (
            <div className="flex h-screen items-center justify-center p-6 text-center">
                <h1 className="text-xl font-bold text-red-600">System Error</h1>
            </div>
        );
    }
}