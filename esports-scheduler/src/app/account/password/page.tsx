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
        // Clear fields (optional)
        setMessage('Password updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirm('');

        // Redirect to success page
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
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-xl font-semibold mb-4">Change password</h1>

      {message && (
        <div className="mb-3 rounded border border-green-300 bg-green-50 p-2 text-sm text-green-700">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-3 rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Current password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full rounded border px-3 py-2 bg-white dark:bg-neutral-900"
            autoComplete="current-password"
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-1">New password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded border px-3 py-2 bg-white dark:bg-neutral-900"
            autoComplete="new-password"
            required
            minLength={8}
          />
          <p className="text-xs text-neutral-500 mt-1">At least 8 characters.</p>
        </div>

        <div>
          <label className="block text-sm mb-1">Confirm new password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded border px-3 py-2 bg-white dark:bg-neutral-900"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-3 py-2 rounded border"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-3 py-2 rounded bg-black text-white dark:bg-white dark:text-black disabled:opacity-60"
          >
            {loading ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
