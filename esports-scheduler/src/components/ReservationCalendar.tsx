'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { DateSelectArg, EventClickArg, EventInput } from '@fullcalendar/core';
import { useSession, signIn, signOut } from 'next-auth/react';

// FullCalendar (client-only)
const FullCalendar = dynamic(() => import('@fullcalendar/react'), { ssr: false });

type Team = { id: string; name: string; gameTitle: string };
type Computer = { id: number; label: string; isActive: boolean };
type ReservationDTO = {
  id: string;
  teamId: string;
  computerId: number;
  startsAt: string;
  endsAt: string;
  team?: { name: string };
  computer?: { label: string };
  createdBy?: { id: string; name: string | null; email: string | null };
};

async function fetchJson<T = any>(url: string, init?: RequestInit): Promise<T | null> {
  const res = await fetch(url, init);
  const text = await res.text();
  if (!res.ok) throw new Error(text || `Request failed: ${res.status}`);
  if (!text) return null;
  return JSON.parse(text) as T;
}

export default function ReservationCalendar() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role ?? null;
  const isAdmin = role === 'ADMIN';

  const [events, setEvents] = useState<EventInput[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [computers, setComputers] = useState<Computer[]>([]);

  // Create modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectStart, setSelectStart] = useState<Date | null>(null);
  const [selectEnd, setSelectEnd] = useState<Date | null>(null);
  const [teamId, setTeamId] = useState<string>('');
  const [computerIds, setComputerIds] = useState<number[]>([]);

  // Details modal state
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detail, setDetail] = useState<{
    id: string;
    title: string;
    when: string;
    computer: string;
    team: string;
    createdByName: string;
    createdByEmail: string;
  } | null>(null);

  const loadReservations = useCallback(async () => {
    const data = await fetchJson<ReservationDTO[]>('/api/reservations', { cache: 'no-store' });
    const list = Array.isArray(data) ? data : [];
    setEvents(
      list.map((r) => {
        const start = r.startsAt;
        const end = r.endsAt;
        const title = `${r.computer?.label ?? `PC-${r.computerId}`} — ${r.team?.name ?? r.teamId}`;
        return {
          id: r.id,
          title,
          start,
          end,
          extendedProps: {
            reservationId: r.id,
            computerLabel: r.computer?.label ?? `PC-${r.computerId}`,
            teamName: r.team?.name ?? r.teamId,
            createdByName: r.createdBy?.name ?? r.createdBy?.email ?? 'Unknown',
            createdByEmail: r.createdBy?.email ?? '',
          },
        } as EventInput;
      })
    );
  }, []);

  const loadLookups = useCallback(async () => {
    const [t, c] = await Promise.all([
      fetchJson<Team[]>('/api/teams', { cache: 'no-store' }),
      fetchJson<Computer[]>('/api/computers', { cache: 'no-store' }),
    ]);
    setTeams(
      Array.isArray(t)
        ? t.slice().sort((a, b) => a.gameTitle.localeCompare(b.gameTitle) || a.name.localeCompare(b.name))
        : []
    );
    setComputers(
      Array.isArray(c)
        ? c.filter((x) => x.isActive).sort((a, b) => a.label.localeCompare(b.label, undefined, {numeric: true}))
        : []
    );
  }, []);

  useEffect(() => { loadReservations(); }, [loadReservations]);
  useEffect(() => { loadLookups(); }, [loadLookups]);

  const handleSelect = (arg: DateSelectArg) => {
    if (!isAdmin) {
      alert('Only admins can create reservations.');
      return;
    }
    setComputerIds([]);
    setTeamId('');
    setSelectStart(arg.start);
    setSelectEnd(arg.end);
    setIsCreateOpen(true);
  };

  const handleEventClick = (click: EventClickArg) => {
    const id = String(click.event.id);
    const start = click.event.start ? new Date(click.event.start) : null;
    const end   = click.event.end ? new Date(click.event.end) : null;
    const when  = start && end ? `${start.toLocaleString()} → ${end.toLocaleString()}` : '';
    const xp = click.event.extendedProps as any;

    setDetail({
      id,
      title: String(click.event.title),
      when,
      computer: xp?.computerLabel ?? '',
      team: xp?.teamName ?? '',
      createdByName: xp?.createdByName ?? 'Unknown',
      createdByEmail: xp?.createdByEmail ?? '',
    });
    setIsDetailsOpen(true);
  };

  const submitReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) { alert('Admin only'); return; }
    if (!selectStart || !selectEnd || !teamId || computerIds.length === 0) return;

    const payload = {
      teamId,
      computerIds,
      startsAt: selectStart.toISOString(),
      endsAt: selectEnd.toISOString(),
    };

    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    if (!res.ok) {
      let msg = 'Failed to create reservation';
      try { msg = JSON.parse(text)?.error ?? msg; } catch {}
      alert(msg);
      return;
    }
    setIsCreateOpen(false);
    setTeamId(''); setComputerIds([]);
    await loadReservations();
  };

  const deleteReservation = async () => {
    if (!detail) return;
    const yes = confirm('Are you sure you want to delete this reservation?');
    if (!yes) return;

    const res = await fetch(`/api/reservations/${encodeURIComponent(detail.id)}`, { method: 'DELETE' });
    if (!res.ok) {
      let msg = 'Failed to delete reservation';
      try { msg = (await res.json()).error ?? msg; } catch {}
      alert(msg);
      return;
    }
    setIsDetailsOpen(false);
    setDetail(null);
    await loadReservations();
  };

  const selectAll = () => setComputerIds(computers.map((c) => c.id));
  const clearAll = () => setComputerIds([]);

  return (
    <div className="p-4">
      {/* Banner */}
      <div className="mb-4 flex items-center justify-between rounded-md border p-3 bg-white/70 dark:bg-neutral-900/70 backdrop-blur">
        <p className="text-sm">
          {isAdmin ? 'You are signed in as admin.' : 'View only.'}
        </p>
        {isAdmin ? (
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/' })}
            className="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
          >
            Sign out
          </button>
        ) : (
          <button
            type="button"
            onClick={() => signIn()}
            className="inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition-opacity"
          >
            Admins sign in
          </button>
        )}
      </div>

      {/* CREATE MODAL */}
      {isCreateOpen && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-neutral-900 rounded-xl p-4 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold mb-3">Create reservation</h2>

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
                    <option key={t.id} value={t.id}>{t.name}</option>
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
                    <option key={c.id} value={c.id}>{c.label}</option>
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
                <button type="button" className="px-3 py-2 rounded border" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="px-3 py-2 rounded bg-black text-white dark:bg-white dark:text-black">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILS MODAL */}
      {isDetailsOpen && detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-neutral-900 rounded-xl p-4 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold mb-3">Reservation details</h2>

            <div className="space-y-2 text-sm">
              <div><span className="text-neutral-500">Title:</span> {detail.title}</div>
              <div><span className="text-neutral-500">When:</span> {detail.when}</div>
              <div><span className="text-neutral-500">Computer:</span> {detail.computer}</div>
              <div><span className="text-neutral-500">Team:</span> {detail.team}</div>
              <div><span className="text-neutral-500">Created by:</span> {detail.createdByName}{detail.createdByEmail ? ` (${detail.createdByEmail})` : ''}</div>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <button
                type="button"
                className="px-3 py-2 rounded border"
                onClick={() => { setIsDetailsOpen(false); setDetail(null); }}
              >
                Close
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={deleteReservation}
                  className="px-3 py-2 rounded border border-red-500 text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <FullCalendar
        plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        selectable={isAdmin}
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
