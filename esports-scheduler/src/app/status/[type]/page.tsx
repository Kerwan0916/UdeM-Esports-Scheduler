// app/status/[type]/page.tsx
'use client';

import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function StatusPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const type = params?.type as string; // 'welcome' or 'goodbye'
    const msg = searchParams.get('msg');

    const isWelcome = type === 'welcome';

    return (
        <div className="flex min-h-[80vh] flex-col justify-center py-10 sm:px-6 lg:px-8 text-[#0e0c1a]">

            <div className="sm:mx-auto sm:w-full sm:max-w-[480px]">
                {/* Mobile: Transparent & Flush. Desktop: White Card with Shadow */}
                <div className="bg-white px-6 py-12 shadow sm:rounded-2xl sm:px-12 text-center">

                    {/* Icon Container */}
                    <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full mb-6 ${isWelcome ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                        {isWelcome ? (
                            // Check Icon
                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        ) : (
                            // Exit/Wave Icon
                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        )}
                    </div>

                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-2">
                        {isWelcome ? 'Welcome to the Arena!' : 'See you next time!'}
                    </h1>

                    <p className="text-base text-gray-500 mb-8">
                        {isWelcome
                            ? (msg === 'fixed_stale' ? "We checked you out from yesterday and started a new session for you." : "You are now checked in. GLHF!")
                            : "You have successfully checked out."}
                    </p>

                    {/* Full width button for easy thumb access */}
                    <Link
                        href="/"
                        className="flex w-full justify-center rounded-full bg-[#1a1a1a] px-3 py-3 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                    >
                        Go to Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
}