
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Providers } from "@/components/Providers";
import AuthButton from "@/components/AuthButton";  // ← add this

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "UdeM Esports Scheduler",
  description: "UdeM Esports Scheduler - Manage your esports reservations",
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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* SessionProvider wrapper */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
