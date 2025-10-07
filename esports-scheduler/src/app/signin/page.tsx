'use client';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useState } from 'react';

export default function SignInPage() {
  const { data: session, status } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (status === 'loading') return <div className="p-6">Loading…</div>;

  if (session) {
    return (
      <div className="mx-auto max-w-md p-6 space-y-4 text-[#0e0c1a]">
        <div className="text-sm">
          Signed in as {(session.user as any)?.email} ({(session.user as any)?.role})
        </div>
        <button
          className="rounded-full border px-4 py-2 text-sm hover:bg-neutral-50"
          onClick={() => signOut({ callbackUrl: '/' })}
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md p-6 text-[#0e0c1a]">
      {/* White card wrapper for Airbnb look */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            signIn('credentials', { email, password, redirect: true, callbackUrl: '/' });
          }}
        >
          <h1 className="text-2xl font-semibold tracking-tight">Sign In</h1>

          <input
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2
                       text-slate-900 placeholder:text-slate-500
                       focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2
                       text-slate-900 placeholder:text-slate-500
                       focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              className="rounded-full bg-[#1a1a1a] px-5 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => { setEmail(''); setPassword(''); }}
              className="rounded-full border px-4 py-2 text-sm hover:bg-neutral-50"
            >
              Clear
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
