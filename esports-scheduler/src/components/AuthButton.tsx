'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import Link from 'next/link';

export default function AuthButton() {
  const { data: session, status } = useSession();
  const role = (session?.user as any)?.role;

  if (status === 'loading') {
    return <span className="px-3 py-1.5 text-sm text-gray-500">…</span>;
  }

  // If signed in (admins or not), show Sign out
  if (session) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm hidden sm:inline">
          {(session.user as any)?.email}{role ? ` (${role})` : ''}
        </span>
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="px-3 py-1.5 rounded-lg border hover:bg-gray-50"
        >
          Sign out
        </button>
      </div>
    );
  }

  // Not signed in → go to the sign-in page
  return (
    <Link href="/signin" className="px-3 py-1.5 rounded-lg border hover:bg-gray-50">
      Sign in
    </Link>
  );
}
