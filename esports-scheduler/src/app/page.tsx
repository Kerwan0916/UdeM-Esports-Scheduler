
import ReservationCalendar from '@/components/ReservationCalendar';

export default function Home() {
  return (
    <main className="min-h-screen p-4">
      <h1 className="text-2xl font-semibold mb-4">UdeM Esports Scheduler</h1>
      <ReservationCalendar />
    </main>
  );
}