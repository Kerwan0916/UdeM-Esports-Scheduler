import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";
import { Role } from "@prisma/client";
import Link from "next/link";

const PAGE_SIZE = 15;

// --- 🎨 Color Mapping ---
const GAME_COLORS: Record<string, string> = {
    'valorant': '#9636D9',         // purple
    'cs2': '#22c55e',              // green
    'league of legends': '#f87171',// red
    'rocket league': '#f97316',    // orange
    'overwatch': '#facc15',        // yellow
    'rainbow six': '#34d399',      // teal
    'fortnite': '#f87171',         // red
    'super smash bros': '#7AE810', // lime
    'udem class': '#7C8DF2',       // blue
    'free period': '#34d399',      // teal
    'special events': '#EB42D5',   // red/pink
    'executives': '#DB0745',       // violet
    'staff': '#9CA3AF',            // gray
};

function getGameColor(title: string) {
    const key = title.toLowerCase().trim();
    return GAME_COLORS[key] || '#6b7280';
}

// --- Helper Functions ---
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
        month: "short",
        day: "numeric",
    });
}

// --- Pagination Component ---
function PaginationControls({ currentPage, totalPages }: { currentPage: number, totalPages: number }) {
    //if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
            <div className="flex flex-1 justify-between sm:hidden">
                <Link
                    href={`/admin/logs?page=${Math.max(1, currentPage - 1)}`}
                    className={`relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 ${currentPage === 1 ? 'pointer-events-none opacity-50' : ''}`}
                >
                    Previous
                </Link>
                <Link
                    href={`/admin/logs?page=${Math.min(totalPages, currentPage + 1)}`}
                    className={`relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 ${currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}`}
                >
                    Next
                </Link>
            </div>

            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm text-gray-700">
                        Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
                    </p>
                </div>
                <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                        <Link
                            href={`/admin/logs?page=${Math.max(1, currentPage - 1)}`}
                            className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${currentPage === 1 ? 'pointer-events-none opacity-50' : ''}`}
                        >
                            <span className="sr-only">Previous</span>
                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                            </svg>
                        </Link>
                        <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">
                            {currentPage}
                        </span>
                        <Link
                            href={`/admin/logs?page=${Math.min(totalPages, currentPage + 1)}`}
                            className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}`}
                        >
                            <span className="sr-only">Next</span>
                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                            </svg>
                        </Link>
                    </nav>
                </div>
            </div>
        </div>
    );
}

// --- Main Page Component ---
export default async function AdminLogsPage({ searchParams }: { searchParams: { page?: string } }) {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== Role.ADMIN) {
        redirect("/");
    }

    const currentPage = Number(searchParams.page) || 1;
    const skip = (currentPage - 1) * PAGE_SIZE;

    // 1. Fetch Data
    const [totalLogs, logs] = await prisma.$transaction([
        prisma.presenceLog.count(),
        prisma.presenceLog.findMany({
            take: PAGE_SIZE,
            skip: skip,
            orderBy: { checkIn: 'desc' },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        role: true,
                        teams: {
                            select: {
                                team: {
                                    select: { gameTitle: true }
                                }
                            }
                        }
                    }
                }
            }
        })
    ]);

    const totalPages = Math.ceil(totalLogs / PAGE_SIZE);

    return (
        <div className="mx-auto max-w-7xl p-6 text-[#0e0c1a]">
            <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Facility Access Logs</h1>
                    <p className="text-gray-500">Real-time tracking of who is in the Blue Box.</p>
                </div>
                <div className="mt-4 sm:mt-0 text-sm text-gray-500">
                    Total Logs: <span className="font-medium text-black">{totalLogs}</span>
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">

                <PaginationControls currentPage={currentPage} totalPages={totalPages} />

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                            <tr>
                                {/* USER: Left Aligned */}
                                <th className="px-6 py-3 font-medium text-left">User</th>

                                {/* ALL OTHERS: Center Aligned */}
                                <th className="px-6 py-3 font-medium text-center">Role</th>
                                <th className="px-6 py-3 font-medium text-center">Game / Team</th>
                                <th className="px-6 py-3 font-medium text-center">Date</th>
                                <th className="px-6 py-3 font-medium text-center">Arrival</th>
                                <th className="px-6 py-3 font-medium text-center">Departure</th>
                                <th className="px-6 py-3 font-medium text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {logs.map((log) => {
                                const isActive = !log.checkOut;
                                const gameTitles = Array.from(
                                    new Set(log.user.teams.map(t => t.team.gameTitle))
                                ).filter(Boolean);

                                return (
                                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">

                                        {/* USER: Left Aligned */}
                                        <td className="px-6 py-4 text-left">
                                            <div className="font-medium text-gray-900">{log.user.name || "Unknown"}</div>
                                            <div className="text-xs text-gray-400">{log.user.email}</div>
                                        </td>

                                        {/* ROLE: Centered */}
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${log.user.role === Role.ADMIN
                                                ? 'bg-purple-50 text-purple-700 ring-purple-700/10'
                                                : 'bg-blue-50 text-blue-700 ring-blue-700/10'
                                                }`}>
                                                {log.user.role === Role.ADMIN ? 'Admin' : 'Player'}
                                            </span>
                                        </td>

                                        {/* PILLS: Centered (using justify-center) */}
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-2 justify-center">
                                                {gameTitles.length > 0 ? (
                                                    gameTitles.map((title) => (
                                                        <span
                                                            key={title}
                                                            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-black shadow-sm"
                                                            style={{ backgroundColor: getGameColor(title) }}
                                                        >
                                                            {title}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-gray-400">—</span>
                                                )}
                                            </div>
                                        </td>

                                        {/* DATES & TIMES: Centered */}
                                        <td className="whitespace-nowrap px-6 py-4 text-gray-500 text-center">
                                            {formatDate(log.checkIn)}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-gray-900 font-medium text-center">
                                            {formatTime(log.checkIn)}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-gray-500 text-center">
                                            {formatTime(log.checkOut)}
                                        </td>

                                        {/* STATUS: Centered */}
                                        <td className="whitespace-nowrap px-6 py-4 text-center">
                                            {isActive ? (
                                                <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                                    <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-green-600 animate-pulse"></span>
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                                                    Completed
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}

                            {logs.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                        No logs found on this page.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <PaginationControls currentPage={currentPage} totalPages={totalPages} />

            </div>
        </div>
    );
}