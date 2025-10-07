'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (newPassword !== confirm) {
      setError('New password and confirmation do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) {
        setError(data?.error ?? 'Failed to change password');
      } else {
        setMessage('Password updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirm('');
        router.push('/account/password/success');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to change password';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md p-6 text-[#0e0c1a]">
      {/* Card surface for that airy Airbnb look */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h1 className="text-2xl font-semibold tracking-tight">Change password</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Choose a strong and unique password you will remember
        </p>

        {message && (
          <div className="mt-4 rounded-xl border border-green-300 bg-green-50 p-3 text-sm text-green-700">
            {message}
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Current password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2
                         text-slate-900 placeholder:text-slate-500
                         focus:outline-none focus:ring-2 focus:ring-slate-200"
              autoComplete="current-password"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2
                         text-slate-900 placeholder:text-slate-500
                         focus:outline-none focus:ring-2 focus:ring-slate-200"
              autoComplete="new-password"
              required
              minLength={8}
            />
            <p className="mt-1 text-xs text-neutral-500">At least 8 characters.</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Confirm new password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2
                         text-slate-900 placeholder:text-slate-500
                         focus:outline-none focus:ring-2 focus:ring-slate-200"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-full border px-4 py-2 text-sm hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-[#1a1a1a] px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              {loading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
