import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";

// Helper to force Montreal Timezone
function formatTime(date: Date | string | null) {
    if (!date) return "—"; // Return dash if null

    return new Date(date).toLocaleTimeString("en-US", {
        timeZone: "America/New_York", // Forces EST/EDT (Montreal time)
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    });
}

function formatDate(date: Date | string | null) {
    if (!date) return "—";

    return new Date(date).toLocaleDateString("en-US", {
        timeZone: "America/New_York",
        month: "long",
        day: "numeric",
        year: "numeric"
    });
}

export default async function ProfilePage() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        redirect("/api/auth/signin");
    }

    // 1. Fetch the user's scan history
    const logs = await prisma.presenceLog.findMany({
        where: {
            userId: (session.user as any).id, // We ensured ID is in session in authOptions
        },
        orderBy: {
            checkIn: "desc",
        },
        take: 50, // Limit to last 50 entries
    });

    return (
        <div className="mx-auto max-w-4xl p-6 text-[#0e0c1a]">
            {/* Header Section */}
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Your Profile</h1>
                    <p className="text-gray-500">
                        Welcome back, {session.user.name || session.user.email}
                    </p>
                </div>

                {/* The "Change Password" button moved here */}
                <Link
                    href="/account/password"
                    className="inline-flex items-center justify-center rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
                >
                    Change Password
                </Link>
            </div>

            {/* History Board */}
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
                    <h2 className="font-semibold text-gray-900">Blue Box Visits History</h2>
                </div>

                {logs.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No Blue Box visits history found. Visit the Blue Box to scan in!
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-white text-gray-500">
                                <tr className="border-b border-gray-100">
                                    <th className="px-6 py-3 font-medium">Date</th>
                                    <th className="px-6 py-3 font-medium">Arrival</th>
                                    <th className="px-6 py-3 font-medium">Departure</th>
                                    <th className="px-6 py-3 font-medium text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {logs.map((log) => {
                                    const dateStr = formatDate(log.checkIn);
                                    const arrivalStr = formatTime(log.checkIn);
                                    const departureStr = formatTime(log.checkOut);

                                    const isActive = !log.checkOut;

                                    return (
                                        <tr key={log.id} className="hover:bg-gray-50/50">
                                            <td className="whitespace-nowrap px-6 py-4 text-gray-900">
                                                {dateStr}
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                                                {arrivalStr}
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                                                {departureStr}
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-right">
                                                {isActive ? (
                                                    <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                                                        Completed
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}