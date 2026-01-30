// src/app/signup/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignUpPage() {
    const router = useRouter();
    const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (form.password !== form.confirm) {
            setError("Passwords don't match");
            setLoading(false);
            return;
        }

        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: form.name,
                email: form.email,
                password: form.password,
            }),
        });

        if (!res.ok) {
            const data = await res.json();
            setError(data.error || 'Registration failed');
            setLoading(false);
            return;
        }

        // Redirect to home (Sign In) page on success
        router.push('/?message=Account created! Please log in.');
    };

    return (
        <div className="mx-auto max-w-md p-6 text-[#0e0c1a]">
            {/* White card wrapper to match your Sign In page */}
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
                <h1 className="text-2xl font-semibold tracking-tight mb-4">Create account</h1>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                            {error}
                        </div>
                    )}

                    <input
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        placeholder="Full Name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                    />

                    <input
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        placeholder="Email (school email)"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        required
                    />

                    <input
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        placeholder="Password"
                        type="password"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        required
                    />

                    <input
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        placeholder="Confirm Password"
                        type="password"
                        value={form.confirm}
                        onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                        required
                    />

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-full bg-[#1a1a1a] px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                        >
                            {loading ? 'Creating...' : 'Sign Up'}
                        </button>
                    </div>
                </form>

                <div className="mt-6 border-t pt-4 text-center text-sm text-slate-500">
                    Already have an account?{' '}
                    <Link href="/signin" className="font-medium text-slate-900 hover:underline">
                        Sign in
                    </Link>
                </div>
            </div>
        </div>
    );
}