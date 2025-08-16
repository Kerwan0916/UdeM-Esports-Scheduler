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
      <div className="p-6 space-y-3">
        <div>Signed in as {(session.user as any)?.email} ({(session.user as any)?.role})</div>
        <button className="border px-3 py-2" onClick={() => signOut({ callbackUrl: '/' })}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <form
      className="p-6 space-y-3 max-w-sm"
      onSubmit={(e) => {
        e.preventDefault();
        signIn('credentials', { email, password, redirect: true, callbackUrl: '/' });
      }}
    >
      <h1 className="text-lg font-semibold">Admin sign in</h1>
      <input className="border w-full px-3 py-2" placeholder="email" value={email} onChange={e => setEmail(e.target.value)} />
      <input className="border w-full px-3 py-2" placeholder="password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <button className="border px-3 py-2" type="submit">Sign in</button>
    </form>
  );
}
