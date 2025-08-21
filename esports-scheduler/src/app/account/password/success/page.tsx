import Link from 'next/link';

export default function PasswordChangedSuccess() {
  return (
    <div className="max-w-md mx-auto p-6 text-center">
      <h1 className="text-2xl font-semibold mb-2">Password has been changed!</h1>
      <p className="text-neutral-500 mb-6">You’re all set.</p>

      <div className="flex justify-center gap-3">
        <Link
          href="/"
          className="px-3 py-2 rounded bg-black text-white dark:bg-white dark:text-black"
        >
          Back to scheduler
        </Link>
      </div>
    </div>
  );
}