import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";

// Reuse our Timezone Helpers
function formatTime(date: Date | null) {
    if (!date) return "—";
    return new Date(date).toLocaleTimeString("en-US", {
        timeZone: "America/New_York",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    });
}

function formatDate(date: Date | null) {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
        timeZone: "America/New_York",
        month: "short", // "Jan" instead of "January" to save space
        day: "numeric",
    });
}

export default async function AdminLogsPage() {
    const session = await getServerSession(authOptions);

    // 1. SECURITY: Admin Only Guard
    if (!session || (session.user as any).role !== 'ADMIN') {
        redirect("/"); // Kick them out if not admin
    }

    // 2. FETCH DATA: Get all logs + User info
    const logs = await prisma.presenceLog.findMany({
        take: 100, // Show last 100 entries
        orderBy: { checkIn: 'desc' },
        include: {
            user: {
                select: { name: true, email: true, role: true }
            }
        }
    });

    return (
        <div className="mx-auto max-w-7xl p-6 text-[#0e0c1a]">
            <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight">Blue Box Access Logs</h1>
                <p className="text-gray-500">Real-time tracking of who is in the Blue Box.</p>
            </div>

            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-3 font-medium">User</th>
                                <th className="px-6 py-3 font-medium">Role</th>
                                <th className="px-6 py-3 font-medium">Date</th>
                                <th className="px-6 py-3 font-medium">Arrival</th>
                                <th className="px-6 py-3 font-medium">Departure</th>
                                <th className="px-6 py-3 font-medium text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {logs.map((log) => {
                                const isActive = !log.checkOut;

                                return (
                                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                                        {/* User Name & Email */}
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{log.user.name || "Unknown"}</div>
                                            <div className="text-xs text-gray-400">{log.user.email}</div>
                                        </td>

                                        {/* Role Badge */}
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${log.user.role === 'ADMIN'
                                                ? 'bg-purple-50 text-purple-700 ring-purple-700/10'
                                                : 'bg-blue-50 text-blue-700 ring-blue-700/10'
                                                }`}>
                                                {log.user.role === 'ADMIN' ? 'Admin' : 'Player'}
                                            </span>
                                        </td>

                                        {/* Date */}
                                        <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                                            {formatDate(log.checkIn)}
                                        </td>

                                        {/* Arrival */}
                                        <td className="whitespace-nowrap px-6 py-4 text-gray-900 font-medium">
                                            {formatTime(log.checkIn)}
                                        </td>

                                        {/* Departure */}
                                        <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                                            {formatTime(log.checkOut)}
                                        </td>

                                        {/* Status Pill */}
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
            </div>
        </div>
    );
}