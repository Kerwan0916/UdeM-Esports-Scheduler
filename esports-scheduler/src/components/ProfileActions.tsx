"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Team {
    id: string;
    name: string;
}

export default function ProfileActions({
    teams,
    currentTeamId
}: {
    teams: Team[],
    currentTeamId: string
}) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // 1. Local State for the selection
    // We initialize it with the prop, but user changes affect ONLY this variable first.
    const [selectedTeam, setSelectedTeam] = useState(currentTeamId);

    // 2. The Save Function
    const handleSave = async () => {
        // If nothing changed, just close the modal
        if (selectedTeam === currentTeamId) {
            setIsOpen(false);
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/profile/team", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ teamId: selectedTeam }),
            });

            if (res.ok) {
                router.refresh(); // Refresh Server Components to update the tag
                setIsOpen(false); // Close Modal
            }
        } catch (error) {
            console.error("Failed to save", error);
        } finally {
            setLoading(false);
        }
    };

    // Reset state when opening/closing so it doesn't get stuck
    const toggleModal = (open: boolean) => {
        if (open) setSelectedTeam(currentTeamId); // Reset to current DB value
        setIsOpen(open);
    };

    return (
        <>
            <button
                onClick={() => toggleModal(true)}
                className="inline-flex items-center justify-center rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
                Edit Profile
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                        onClick={() => toggleModal(false)}
                    />

                    <div className="relative w-full max-w-sm transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">

                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-gray-900">Edit Profile</h3>
                            <button
                                onClick={() => toggleModal(false)}
                                className="text-gray-400 hover:text-gray-500"
                            >
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Team Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Your Team / Game
                                </label>

                                {/* Custom Dropdown UI */}
                                <div className="relative">
                                    <select
                                        value={selectedTeam}
                                        onChange={(e) => setSelectedTeam(e.target.value)}
                                        className="appearance-none cursor-pointer block w-full rounded-xl border-gray-200 bg-gray-50 py-3 pl-4 pr-10 text-sm font-medium text-gray-900 focus:border-black focus:ring-black outline-none transition"
                                    >
                                        <option value="" disabled>Select a game...</option>
                                        {teams.map((team) => (
                                            <option key={team.id} value={team.id}>
                                                {team.name}
                                            </option>
                                        ))}
                                    </select>
                                    {/* Arrow Icon */}
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>

                                <p className="mt-2 text-xs text-gray-500">
                                    Select your main game to display a badge on your profile.
                                </p>
                            </div>

                            <div className="border-t border-gray-100"></div>

                            {/* Password Link */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Security
                                </label>
                                <Link
                                    href="/account/password"
                                    className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 transition hover:bg-gray-50 hover:border-gray-300"
                                >
                                    <span>Change Password</span>
                                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </Link>
                            </div>

                            {/* SAVE BUTTON */}
                            <div className="pt-2">
                                <button
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="flex w-full justify-center rounded-full bg-black px-3 py-3 text-sm font-semibold text-white shadow-sm hover:bg-neutral-800 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {loading ? "Saving..." : "Save Changes"}
                                </button>
                            </div>

                        </div>

                    </div>
                </div>
            )}
        </>
    );
}