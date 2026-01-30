"use client";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import Image from "next/image";
import Icon from "@/app/icon.png";

export default function TopNav() {
  const { data: session, status } = useSession();
  const role = (session?.user as any)?.role;
  const isAdmin = !!role && String(role).toLowerCase().includes("admin");

  const rawName =
    (session?.user as any)?.name ||
    ((session?.user as any)?.email ? String((session?.user as any)?.email).split("@")[0] : "") ||
    "";

  const displayName = toTitle(rawName);

  // 🎨 THE FIX: Explicitly using the cream color (#F0EAD6) for the border and text.
  // This creates the "Ghost Button" style: Yellow Outline -> Filled Yellow on Hover.
  const baseClass = "rounded-full border border-[#F0EAD6] text-[#F0EAD6] hover:bg-[#F0EAD6] hover:text-[#0e0c1a] transition";

  const iconBtnClass = `${baseClass} p-2 flex items-center justify-center`;
  const textBtnClass = `${baseClass} px-3 py-1.5 text-sm font-medium`;

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
          <span className="hidden sm:inline text-base font-semibold tracking-tight text-white">Scheduler</span>
        </Link>

        {/* Center Status Pill (Hidden on mobile) */}
        <div className="hidden md:block text-sm">
          {status === "loading" ? (
            <span className="text-gray-400">Loading…</span>
          ) : isAdmin ? (
            // ADMIN: Light Green Background
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-800 ring-1 ring-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="font-semibold">{displayName}</span>
              <span className="opacity-75">Admin View</span>
            </span>
          ) : session ? (
            // PLAYER: Light Sapphire Background
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-blue-800 ring-1 ring-blue-200">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="font-semibold">{displayName}</span>
              <span className="opacity-75">Player View</span>
            </span>
          ) : (
            // GUEST: Light Gray Background
            <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-gray-800 ring-1 ring-gray-200">
              <span className="h-2 w-2 rounded-full bg-gray-500" />
              View only
            </span>
          )}
        </div>

        {/* Right: Navigation & Auth */}
        <div className="flex items-center gap-2">

          {/* Calendar Icon Button */}
          <Link
            href="/"
            title="Calendar"
            className={iconBtnClass}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </Link>

          {/* Computer Map Button (Text) */}
          <Link
            href="/mapview"
            className={textBtnClass}
          >
            <span className="hidden sm:inline">Computer Map</span>
            <span className="sm:hidden">Map</span>
          </Link>

          {status === "loading" ? null : session ? (
            <>
              {/* Profile Icon Button */}
              <Link
                href="/profile"
                title="Profile"
                className={iconBtnClass}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </Link>

              {/* Sign Out Icon Button */}
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                title="Sign Out"
                className={iconBtnClass}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
              </button>
            </>
          ) : (
            <button
              onClick={() => signIn()}
              className={textBtnClass}
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

function toTitle(s: string) {
  if (!s) return "";
  return s
    .replace(/[-_.]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}