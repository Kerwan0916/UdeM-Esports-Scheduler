'use client';

import React, { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { DateSelectArg, EventClickArg, EventInput } from '@fullcalendar/core';

// FullCalendar (client-only)
const FullCalendar = dynamic(() => import('@fullcalendar/react'), { ssr: false });

// Styles (your install ships CSS only in the plugins, not in @fullcalendar/core)
import '@fullcalendar/daygrid/main.css';  
import '@fullcalendar/timegrid/main.css';  

type Team = { id: string; name: string; gameTitle: string };
type Computer = { id: number; label: string; isActive: boolean };
type Reservation = {
  id: string;
  teamId: string;
  computerId: number;
  startsAt: string;
  endsAt: string;
  team?: { name: string };
  computer?: { label: string };
};

export default function ReservationCalendar() {
  const [events, setEvents] = useState<EventInput[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [computers, setComputers] = useState<Computer[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // modal state
  const [isOpen, setIsOpen] = useState(false);
  const [selectStart, setSelectStart] = useState<Date | null>(null);
  const [selectEnd, setSelectEnd] = useState<Date | null>(null);
  const [teamId, setTeamId] = useState<string>('');
  const [computerId, setComputerId] = useState<number | ''>('');

  // load reservations
  const loadReservations = useCallback(async () => {
    const res = await fetch('/api/reservations', { cache: 'no-store' });
    const data: Reservation[] = await res.json();
    setEvents(
      data.map((r) => ({
        id: r.id,
        title: `${r.computer?.label ?? 'PC'} — ${r.team?.name ?? r.teamId}`,
        start: r.startsAt,
        end: r.endsAt,
      }))
    );
  }, []);

  // load dropdown data
  const loadLookups = useCallback(async () => {
    const [t, c] = await Promise.all([
      fetch('/api/teams', { cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/computers', { cache: 'no-store' }).then((r) => r.json()),
    ]);
    setTeams(t as Team[]);
    setComputers((c as Computer[]).filter((x) => x.isActive));
  }, []);

  // load default user id for createdByUserId
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/default-user', { cache: 'no-store' });
        if (res.ok) {
          const u = await res.json();
          setCurrentUserId(u.id as string);
        } else {
          console.error('default-user failed', await res.text());
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  useEffect(() => { loadReservations(); }, [loadReservations]);
  useEffect(() => { loadLookups(); }, [loadLookups]);

  const handleSelect = (arg: DateSelectArg) => {
    if (!currentUserId) {
      alert('User not loaded yet. Try again in a second.');
      return;
    }
    setSelectStart(arg.start);
    setSelectEnd(arg.end);
    setIsOpen(true);
  };

  const handleEventClick = (click: EventClickArg) => {
    alert(`Reservation: ${click.event.title}`);
  };

  const submitReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectStart || !selectEnd || !teamId || !computerId || !currentUserId) return;

    const payload = {
      teamId,
      computerId: Number(computerId),
      startsAt: selectStart.toISOString(),
      endsAt: selectEnd.toISOString(),
      createdByUserId: currentUserId, // <-- critical
    };

    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setIsOpen(false);
      setTeamId('');
      setComputerId('');
      await loadReservations();
    } else {
      const { error } = await res.json().catch(() => ({}));
      alert(error ?? 'Failed to create reservation');
    }
  };

  return (
    <div className="p-4">
      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-neutral-900 rounded-xl p-4 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold mb-3">Create reservation</h2>

            <div className="text-xs text-neutral-500 mb-2">
              {currentUserId ? `Creating as: ${currentUserId}` : 'Loading user…'}
            </div>

            <form onSubmit={submitReservation} className="space-y-3">
              <div>
                <label className="block text-sm mb-1">Team</label>
                <select
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  className="w-full rounded border px-3 py-2 bg-white dark:bg-neutral-800"
                  required
                >
                  <option value="" disabled>Select a team</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {t.gameTitle}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1">Computer</label>
                <select
                  value={computerId}
                  onChange={(e) => setComputerId(Number(e.target.value))}
                  className="w-full rounded border px-3 py-2 bg-white dark:bg-neutral-800"
                  required
                >
                  <option value="" disabled>Select a computer</option>
                  {computers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-xs text-neutral-500">
                {selectStart && selectEnd
                  ? `Time: ${selectStart.toLocaleString()} → ${selectEnd.toLocaleString()}`
                  : null}
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  className="px-3 py-2 rounded border"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-2 rounded bg-black text-white dark:bg-white dark:text-black disabled:opacity-60"
                  disabled={!currentUserId}
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <FullCalendar
        plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        selectable
        selectMirror
        height="auto"
        allDaySlot={false}
        slotMinTime="08:00:00"
        slotMaxTime="24:00:00"
        select={handleSelect}
        eventClick={handleEventClick}
        events={events}
      />
    </div>
  );
}
