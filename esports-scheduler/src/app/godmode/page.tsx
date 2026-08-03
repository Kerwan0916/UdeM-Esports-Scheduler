"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

type UserType = {
    id: string;
    email: string;
    name: string | null;
    role: string;
};

export default function GodmodePage() {
    const { data: session, status } = useSession();
    const [users, setUsers] = useState<UserType[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    const isGodmode = !!(session?.user as any)?.godmode;

    useEffect(() => {
        if (status === "loading") return;
        if (!isGodmode) {
            setLoading(false);
            return;
        }

        fetchUsers();
    }, [status, isGodmode]);

    const fetchUsers = async () => {
        try {
            const res = await fetch("/api/godmode/users");
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            } else {
                setMessage({ text: "Failed to fetch users.", type: "error" });
            }
        } catch (e) {
            setMessage({ text: "Error fetching users.", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    const resetPassword = async (userId: string, email: string) => {
        if (!confirm(`Are you sure you want to reset the password for ${email} to "udemesports2026"?`)) {
            return;
        }

        try {
            const res = await fetch("/api/godmode/reset-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ userId }),
            });

            if (res.ok) {
                setMessage({ text: `Password successfully reset for ${email}.`, type: "success" });
            } else {
                setMessage({ text: `Failed to reset password for ${email}.`, type: "error" });
            }
        } catch (e) {
            setMessage({ text: "An error occurred.", type: "error" });
        }

        // Clear message after 5 seconds
        setTimeout(() => setMessage(null), 5000);
    };

    if (status === "loading" || loading) {
        return <div className="p-8 text-white relative bg-[#0e0c1a] min-h-screen pt-20">Loading...</div>;
    }

    if (!isGodmode) {
        return (
            <div className="p-8 text-white relative bg-[#0e0c1a] min-h-screen pt-20 flex flex-col items-center justify-center border-t border-[#1a172c]">
                <h1 className="text-3xl font-bold mb-4">Unauthorized</h1>
                <p className="text-gray-400">You do not have permission to access the Godmode page.</p>
            </div>
        );
    }

    return (
        <div className="p-8 text-[#F0EAD6] relative bg-[#0e0c1a] min-h-screen pt-20 border-t border-[#1a172c]">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-6">Godmode Control Panel</h1>

                {message && (
                    <div className={`mb-6 p-4 rounded-md ${message.type === 'success' ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/50' : 'bg-red-500/20 text-red-200 border border-red-500/50'}`}>
                        {message.text}
                    </div>
                )}

                <div className="bg-[#151226] rounded-xl border border-[#2a264a] overflow-hidden">
                    <table className="min-w-full divide-y divide-[#2a264a]">
                        <thead className="bg-[#1a172c]">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">User</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Role</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2a264a] bg-[#151226]">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-[#1a172c] transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-[#F0EAD6]">{user.name || 'No Name'}</div>
                                        <div className="text-sm text-gray-400">{user.email}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => resetPassword(user.id, user.email)}
                                            className="text-red-400 hover:text-red-300 transition-colors border border-red-400/50 hover:bg-red-400/10 rounded-md px-3 py-1.5"
                                        >
                                            Reset Password
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {users.length === 0 && (
                        <div className="text-center py-8 text-gray-400">
                            No users found.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
