
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Providers } from "@/components/Providers";
import AuthButton from "@/components/AuthButton";  // New import
import TopNav from "@/components/TopNav";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "UdeM Esports Scheduler",
  description: "UdeM Esports Scheduler",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fullcalendar/core@6.1.10/index.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fullcalendar/daygrid@6.1.10/index.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fullcalendar/timegrid@6.1.10/index.css" />
        <style>{`
          /* optional: small gutter + prevent text bleed */
          .fc .fc-timegrid-event { margin: 0 1px; }
          .fc .fc-timegrid-event .fc-event-main { overflow: hidden; white-space: normal; }
        `}</style>
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0e0c1a] text-[#e9e9ea]`}>
        <Providers>
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:shadow">
            Skip to content
          </a>

          <header className="sticky top-0 z-50 bg-[#110d20] border-b border-black/10">
            <TopNav />
          </header>

          {/* ~75% viewport width on xl+ */}
          <main id="main" className="mx-auto max-w-7xl xl:max-w-[75vw] px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>

          <footer className="border-t border-black/5">
            <div className="mx-auto max-w-7xl xl:max-w-[75vw] px-4 sm:px-6 lg:px-8 py-6 text-sm text-[#717171]">
              © {new Date().getFullYear()} UdeM Esports Scheduler
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
