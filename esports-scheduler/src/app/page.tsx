'use client';

import ReservationCalendar from '@/components/ReservationCalendar';

export default function Home() {
  return (
    // old text in the header :
    // <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-4">UdeM Esports Scheduler</h1>
    <main className="min-h-screen">
      <ReservationCalendar />
    </main>
  );
}