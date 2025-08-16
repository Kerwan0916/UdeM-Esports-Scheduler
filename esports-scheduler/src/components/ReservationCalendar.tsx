'use client';

import React, { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { DateSelectArg, EventClickArg, EventInput } from '@fullcalendar/core';

const FullCalendar = dynamic(() => import('@fullcalendar/react'), { ssr: false });

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

// --- helper: fetch JSON safely & log problems ---
async function fetchJson<T = any>(url: string, init?: RequestInit): Promise<T | null> {
  const res = await fetch(url, init);
  const text = await res.text(); // read raw so we can diagnose
  if (!res.ok) {
    console.error(`[fetchJson] ${url} -> ${res.status}`, text);
    throw new Error(`Request failed: ${url} (${res.status})`);
  }
  if (!text) return null; // 204/empty
  try {
    return JSON.parse(text) as T;
  } catch (e) {
    console.error(`[fetchJson] Non-JSON from ${url}:`, text);
    throw e;
  }
}

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
  const [computerIds, setComputerIds] = useState<number[]>([]); // multi-PC

  // load reservations
  const loadReservations = useCallback(async () => {
    const data = await fetchJson<Reservation[]>('/api/reservations', { cache: 'no-store' });
    const list = Array.isArray(data) ? data : [];
    setEvents(
      list.map((r) => ({
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
      fetchJson<Team[]>('/api/teams', { cache: 'no-store' }),
      fetchJson<Computer[]>('/api/computers', { cache: 'no-store' }),
    ]);
    setTeams(Array.isArray(t) ? t : []);
    setComputers(Array.isArray(c) ? c.filter((x) => x.isActive).sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true })) : []);
  }, []);

  // load default user id for createdByUserId
  useEffect(() => {
    (async () => {
      try {
        const u = await fetchJson<{ id: string }>('/api/default-user', { cache: 'no-store' });
        if (u?.id) setCurrentUserId(u.id);
      } catch (e) {
        // already logged by fetchJson
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
    if (!selectStart || !selectEnd || !teamId || computerIds.length === 0 || !currentUserId) return;

    const payload = {
      teamId,
      computerIds, // ARRAY for multi-PC reservations
      startsAt: selectStart.toISOString(),
      endsAt: selectEnd.toISOString(),
      createdByUserId: currentUserId,
    };

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      if (!res.ok) {
        console.error('[POST /api/reservations] failed:', text);
        let msg = 'Failed to create reservation';
        try { msg = JSON.parse(text)?.error ?? msg; } catch {}
        alert(msg);
        return;
      }
      // success -> refresh events
      await loadReservations();
      setIsOpen(false);
      setTeamId('');
      setComputerIds([]);
    } catch (err) {
      console.error(err);
      alert('Network error while creating reservations');
    }
  };

  const selectAll = () => setComputerIds(computers.map((c) => c.id));
  const clearAll = () => setComputerIds([]);

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
                <div className="flex items-center justify-between">
                  <label className="block text-sm mb-1">Computer(s)</label>
                  <div className="flex gap-2 text-xs">
                    <button type="button" className="underline" onClick={selectAll}>Select all</button>
                    <button type="button" className="underline" onClick={clearAll}>Clear</button>
                  </div>
                </div>
                <select
                  multiple
                  value={computerIds.map(String)}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, (opt) => Number(opt.value));
                    setComputerIds(selected);
                  }}
                  className="w-full rounded border px-3 py-2 bg-white dark:bg-neutral-800"
                  required
                  size={8}
                >
                  {computers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-neutral-500 mt-1">
                  Hold Ctrl (Windows) or Cmd (Mac) to select multiple.
                </p>
              </div>

              <div className="text-xs text-neutral-500">
                {selectStart && selectEnd
                  ? `Time: ${selectStart.toLocaleString()} → ${selectEnd.toLocaleString()}`
                  : null}
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button type="button" className="px-3 py-2 rounded border" onClick={() => setIsOpen(false)}>
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
