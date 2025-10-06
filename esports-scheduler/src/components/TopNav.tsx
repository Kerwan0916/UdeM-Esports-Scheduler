"use client";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import Image from "next/image";
import Icon from "@/app/icon.png";

export default function TopNav() {
  const { data: session, status } = useSession();
  const role = (session?.user as any)?.role;
  const isAdmin = !!role && String(role).toLowerCase().includes("admin");

  return (
    <nav className="mx-auto max-w-7xl xl:max-w-[75vw] px-4 sm:px-6 lg:px-8">
      <div className="flex h-16 items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2">
            <Image 
            src={Icon}
            alt="UdeM Esports Scheduler"
            width={32}
            height={32}
            className="rounded-xl"
            />
            <span className="text-base font-semibold tracking-tight">Scheduler</span>
        </Link>

        {/* Center status text */}
        <div className="text-sm">
          {status === "loading" ? (
            <span className="text-gray-600">Loading…</span>
          ) : isAdmin ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-800 ring-1 ring-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Admin view
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-gray-800 ring-1 ring-gray-200">
              <span className="h-2 w-2 rounded-full bg-gray-500" />
              View only
            </span>
          )}
        </div>

        {/* Right: sign in/out, wired to next-auth */}
        <div>
          {status === "loading" ? null : session ? (
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="px-3 py-1.5 rounded-full border hover:bg-[#F0EAD6] hover:text-[#0e0c1a] transition text-sm"
            >
              Sign out
            </button>
          ) : (
            <button
              onClick={() => signIn()}
              className="px-3 py-1.5 rounded-full border hover:bg-[#F0EAD6] hover:text-[#0e0c1a] transition text-sm"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
