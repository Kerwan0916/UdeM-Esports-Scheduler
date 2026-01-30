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
        <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
            <div className={`rounded-full p-6 mb-6 ${isWelcome ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                {isWelcome ? (
                    // Simple Check Icon
                    <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                ) : (
                    // Simple Wave/Exit Icon
                    <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                )}
            </div>

            <h1 className="text-3xl font-bold mb-2">
                {isWelcome ? 'Welcome to the Arena!' : 'See you next time!'}
            </h1>

            <p className="text-neutral-600 mb-8 max-w-sm">
                {isWelcome
                    ? (msg === 'fixed_stale' ? "We checked you out from yesterday and started a new session for you." : "You are now checked in. GLHF!")
                    : "You have successfully checked out."}
            </p>

            <Link
                href="/"
                className="px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-neutral-800 transition-colors"
            >
                Go to Dashboard
            </Link>
        </div>
    );
}