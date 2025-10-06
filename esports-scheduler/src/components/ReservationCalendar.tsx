'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { DateSelectArg, EventClickArg, EventInput } from '@fullcalendar/core';
import { useSession, signIn, signOut } from 'next-auth/react';
import FullCalendar from '@fullcalendar/react';
import Link from 'next/link';

// Map game titles → event color (case-insensitive keys)
const GAME_COLORS: Record<string, string> = {
  'valorant': '#a78bfa', // purple
  'cs2': '#22c55e', // green
  'league of legends': '#f87171', // red
  'rocket league': '#f97316', //  orange
  'dota 2': '#ef4444', // bright red
  'overwatch': '#facc15', // yellow
  'fifa': '#8b5cf6', // violet
  'apex legends': '#eb8f34', // 
  'call of duty': '#34d399', // teal
  'fortnite': '#f87171', // red
  'udem class': '#f472b6', // pink
};

// SSE endpoint (server route must exist)
const SSE_URL = '/api/stream/reservations';

// Evenly split width among overlapping events within each day column
function equalizeTimegridOverlaps() {
  if (typeof document === 'undefined') return;

  const cols = document.querySelectorAll('.fc-timegrid-col:not(.fc-day-disabled)');
  cols.forEach((col) => {
    const harnesses = Array.from(
      col.querySelectorAll<HTMLElement>('.fc-timegrid-event-harness, .fc-timegrid-event-harness-inset')
    );
    const innerEvents = Array.from(
      col.querySelectorAll<HTMLElement>(
        '.fc-timegrid-event-harness .fc-timegrid-event, .fc-timegrid-event-harness-inset .fc-timegrid-event'
      )
    );

    harnesses.forEach((el) => {
      el.style.left = '0%';
      el.style.right = '0%';
      el.style.width = '';
    });
    innerEvents.forEach((el) => {
      el.style.left = '0%';
      el.style.right = '0%';
      el.style.width = '';
    });

    const items = harnesses
      .map((el) => ({ el, rect: el.getBoundingClientRect() }))
      .sort((a, b) => a.rect.top - b.rect.top);

    let cluster: { el: HTMLElement; rect: DOMRect }[] = [];

    function layoutCluster(arr: { el: HTMLElement; rect: DOMRect }[]) {
      const n = arr.length;
      if (n <= 1) return;
      arr.forEach((c, idx) => {
        const leftPct = (idx / n) * 100;
        const rightPct = (1 - (idx + 1) / n) * 100;
        c.el.style.left = leftPct + '%';
        c.el.style.right = rightPct + '%';
        c.el.style.width = '';
      });
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!cluster.length) {
        cluster = [it];
        continue;
      }
      const overlapsOne = cluster.some((c) => c.rect.bottom > it.rect.top && c.rect.top < it.rect.bottom);
      if (overlapsOne) cluster.push(it);
      else {
        layoutCluster(cluster);
        cluster = [it];
      }
    }
    if (cluster.length) layoutCluster(cluster);
  });
}

const scheduleEqualize = () => {
  if (typeof requestAnimationFrame !== 'undefined') {
    requestAnimationFrame(equalizeTimegridOverlaps);
  } else {
    setTimeout(equalizeTimegridOverlaps, 0);
  }
};

type Team = { id: string; name: string; gameTitle: string };
type Computer = { id: number; label: string; isActive: boolean };

type ReservationGroupDTO = {
  id: string;
  teamId: string;
  startsAt: string;
  endsAt: string;
  team?: { name: string };
  computers: { id: number; label: string }[];
  createdBy?: { id: string; name: string | null; email: string | null };
};

async function fetchJson<T = any>(url: string, init?: RequestInit): Promise<T | null> {
  const res = await fetch(url, init);
  const text = await res.text();
  if (!res.ok) throw new Error(text || `Request failed: ${res.status}`);
  if (!text) return null;
  return JSON.parse(text) as T;
}

function summarizePcLabels(labels: string[]) {
  const parsed = labels.map((l) => {
    const m = l.match(/(\d+)\s*$/);
    return { label: l, n: m ? parseInt(m[1], 10) : NaN };
  });
  if (parsed.some((p) => Number.isNaN(p.n))) return `PCs ${labels.join(', ')}`;
  parsed.sort((a, b) => a.n - b.n);
  const out: string[] = [];
  let s = parsed[0].n,
    p = s;
  for (let i = 1; i < parsed.length; i++) {
    const cur = parsed[i].n;
    if (cur === p + 1) {
      p = cur;
      continue;
    }
    out.push(s === p ? `${s}` : `${s}-${p}`);
    s = p = cur;
  }
  out.push(s === p ? `${s}` : `${s}-${p}`);
  return `PCs ${out.join(', ')}`;
}

function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInputValue(v: string): string {
  return new Date(v).toISOString();
}

export default function ReservationCalendar() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role ?? null;
  const isAdmin = role === 'ADMIN';

  const [events, setEvents] = useState<EventInput[]>([]);
  const [eventsRaw, setEventsRaw] = useState<EventInput[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [computers, setComputers] = useState<Computer[]>([]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createManual, setCreateManual] = useState(false);
  const [selectStart, setSelectStart] = useState<Date | null>(null);
  const [selectEnd, setSelectEnd] = useState<Date | null>(null);
  const [teamId, setTeamId] = useState<string>('');
  const [computerIds, setComputerIds] = useState<number[]>([]);
  const [createStartLocal, setCreateStartLocal] = useState<string>('');
  const [createEndLocal, setCreateEndLocal] = useState<string>('');

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detail, setDetail] = useState<{
    id: string;
    title: string;
    when: string;
    computer: string;
    team: string;
    createdByName: string;
    createdByEmail: string;
    isGroup: boolean;
    rawTeamId?: string;
    rawLabels?: string[];
    rawComputerIds?: number[];
    rawStartsAt?: string;
    rawEndsAt?: string;
  } | null>(null);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTeamId, setEditTeamId] = useState<string>('');
  const [editComputerIds, setEditComputerIds] = useState<number[]>([]);
  const [editStartLocal, setEditStartLocal] = useState<string>('');
  const [editEndLocal, setEditEndLocal] = useState<string>('');

  const calendarRef = useRef<FullCalendar | null>(null);

  // ----- LOAD (grouped) -----
  const loadReservations = useCallback(async () => {
    const data = await fetchJson<ReservationGroupDTO[]>('/api/reservations?grouped=1', { cache: 'no-store' });
    const list = Array.isArray(data) ? data : [];
    setEventsRaw(
      list.map((g) => {
        const labels = g.computers.map((c) => c.label);
        const ids = g.computers.map((c) => c.id);
        const summary = summarizePcLabels(labels);
        const title = `${g.team?.name ?? g.teamId} — ${summary} (${labels.length})`;
        return {
          id: g.id,
          title,
          start: g.startsAt,
          end: g.endsAt,
          extendedProps: {
            groupId: g.id,
            labels,
            computerIds: ids,
            teamId: g.teamId,
            teamName: g.team?.name ?? g.teamId,
            createdBy: g.createdBy ?? null,
          },
        } as EventInput;
      })
    );
  }, []);

  useEffect(() => {
    const onResize = () => scheduleEqualize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    scheduleEqualize();
  }, [events]);

  // ----- LOOKUPS -----
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
        ? c.filter((x) => x.isActive).sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
        : []
    );
  }, []);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  // Build teamId → normalized game title
  const teamGameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of teams) m.set(t.id, (t.gameTitle || '').toLowerCase().trim());
    return m;
  }, [teams]);

  // Colorize events based on team game
  useEffect(() => {
    const colored = eventsRaw.map((e) => {
      const teamId = (e.extendedProps as any)?.teamId as string | undefined;
      const key = teamId ? teamGameById.get(teamId) || '' : '';
      const color = GAME_COLORS[key] ?? '#3b82f6';
      return { ...e, backgroundColor: color, borderColor: color };
    });
    setEvents(colored);
    scheduleEqualize();
  }, [eventsRaw, teamGameById]);

  // ----- REAL-TIME: SSE subscribe → refetch on reservation events -----
  const esRef = useRef<EventSource | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const connect = () => {
      // close old connection if any
      if (esRef.current) {
        try {
          esRef.current.close();
        } catch {}
        esRef.current = null;
      }

      // create new connection
      const es = new EventSource(SSE_URL);
      esRef.current = es;

      es.onopen = () => {
        // clear any pending retry timer on successful open
        if (retryTimer.current) {
          clearTimeout(retryTimer.current);
          retryTimer.current = null;
        }
      };

      es.onmessage = async (ev) => {
        try {
          const msg = ev.data ? JSON.parse(ev.data) : null;
          // Expect payloads like { type: 'reservation.created' | 'reservation.updated' | 'reservation.deleted', ... }
          if (msg?.type && String(msg.type).startsWith('reservation.')) {
            await loadReservations();
          }
        } catch {
          // ignore malformed messages
        }
      };

      es.onerror = () => {
        try {
          es.close();
        } catch {}
        esRef.current = null;
        // backoff & reconnect
        if (!retryTimer.current) {
          retryTimer.current = setTimeout(() => {
            retryTimer.current = null;
            connect();
          }, 2000);
        }
      };
    };

    connect();

    // reconnect when tab becomes visible again (helps if host idles the stream)
    const onVis = () => {
      if (document.visibilityState === 'visible' && !esRef.current) {
        connect();
      }
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      document.removeEventListener('visibilitychange', onVis);
      if (retryTimer.current) {
        clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }
      if (esRef.current) {
        try {
          esRef.current.close();
        } catch {}
        esRef.current = null;
      }
    };
  }, [loadReservations]);

  // ----- OPEN CREATE from selection -----
  const handleSelect = (arg: DateSelectArg) => {
    if (!isAdmin) {
      alert('Only admins can create reservations.');
      return;
    }
    setComputerIds([]);
    setTeamId('');
    setSelectStart(arg.start);
    setSelectEnd(arg.end);
    setCreateManual(false);
    setIsCreateOpen(true);
  };

  // ----- OPEN CREATE from toolbar button (manual time) -----
  const openManualCreate = () => {
    if (!isAdmin) {
      alert('Only admins can create reservations.');
      return;
    }
    setComputerIds([]);
    setTeamId('');
    const now = new Date();
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 1);
    const end = new Date(now.getTime() + 60 * 60 * 1000);
    setCreateStartLocal(toLocalInputValue(now.toISOString()));
    setCreateEndLocal(toLocalInputValue(end.toISOString()));
    setSelectStart(null);
    setSelectEnd(null);
    setCreateManual(true);
    setIsCreateOpen(true);
  };

  const handleEventClick = (click: EventClickArg) => {
    const isGroup = true;
    const xp = click.event.extendedProps as any;
    const labels: string[] = xp?.labels ?? [];
    const ids: number[] = xp?.computerIds ?? [];
    const pcSummary = summarizePcLabels(labels);
    const start = click.event.start ? new Date(click.event.start) : null;
    const end = click.event.end ? new Date(click.event.end) : null;
    const when = start && end ? `${start.toLocaleString()} → ${end.toLocaleString()}` : '';
    const cb = xp?.createdBy as { name?: string | null; email?: string | null } | null | undefined;

    setDetail({
      id: String(click.event.id),
      title: String(click.event.title),
      when,
      computer: pcSummary,
      team: xp?.teamName ?? '',
      createdByName: cb?.name ?? cb?.email ?? 'Unknown',
      createdByEmail: cb?.email ?? '',
      isGroup,
      rawTeamId: xp?.teamId,
      rawLabels: labels,
      rawComputerIds: ids,
      rawStartsAt: click.event.start?.toISOString(),
      rawEndsAt: click.event.end?.toISOString(),
    });
    setIsDetailsOpen(true);
  };

  // ----- CREATE -----
  const submitReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Admin only');
      return;
    }
    const startsAt = createManual ? fromLocalInputValue(createStartLocal) : selectStart?.toISOString();
    const endsAt = createManual ? fromLocalInputValue(createEndLocal) : selectEnd?.toISOString();

    if (!startsAt || !endsAt || !teamId || computerIds.length === 0) return;

    const payload = { teamId, computerIds, startsAt, endsAt };
    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    if (!res.ok) {
      let msg = 'Failed to create reservation';
      try {
        msg = JSON.parse(text)?.error ?? msg;
      } catch {}
      alert(msg);
      return;
    }
    setIsCreateOpen(false);
    setTeamId('');
    setComputerIds([]);
    await loadReservations();
  };

  // ----- DELETE (group) -----
  const deleteReservation = async () => {
    if (!detail) return;
    const yes = confirm('Delete this reservation? This removes all PCs in the booking.');
    if (!yes) return;
    const res = await fetch(`/api/reservations?groupId=${encodeURIComponent(detail.id)}`, { method: 'DELETE' });
    if (!res.ok) {
      let msg = 'Failed to delete reservation';
      try {
        msg = (await res.json()).error ?? msg;
      } catch {}
      alert(msg);
      return;
    }
    setIsDetailsOpen(false);
    setDetail(null);
    await loadReservations();
  };

  // ----- EDIT (group) -----
  const openEdit = () => {
    if (!detail) return;
    setEditTeamId(detail.rawTeamId ?? '');
    setEditComputerIds(detail.rawComputerIds ?? []);
    setEditStartLocal(detail.rawStartsAt ? toLocalInputValue(detail.rawStartsAt) : '');
    setEditEndLocal(detail.rawEndsAt ? toLocalInputValue(detail.rawEndsAt) : '');
    setIsEditOpen(true);
  };
  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail) return;
    if (!isAdmin) {
      alert('Admin only');
      return;
    }
    if (!editTeamId || editComputerIds.length === 0 || !editStartLocal || !editEndLocal) return;

    const payload = {
      groupId: detail.id,
      teamId: editTeamId,
      computerIds: editComputerIds,
      startsAt: fromLocalInputValue(editStartLocal),
      endsAt: fromLocalInputValue(editEndLocal),
    };
    const res = await fetch('/api/reservations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    if (!res.ok) {
      let msg = 'Failed to update reservation';
      try {
        msg = JSON.parse(text)?.error ?? msg;
      } catch {}
      alert(msg);
      return;
    }
    setIsEditOpen(false);
    setIsDetailsOpen(false);
    setDetail(null);
    await loadReservations();
  };

  const selectAll = () => setComputerIds(computers.map((c) => c.id));
  const clearAll = () => setComputerIds([]);

  const headerToolbar = useMemo(() => {
    if (!isAdmin) return { left: 'prev,next today', center: 'title', right: 'timeGridWeek,dayGridMonth' };
    return {
      left: 'prev,next today',
      center: 'title createReservation',
      right: 'timeGridWeek,dayGridMonth',
    };
  }, [isAdmin]);

  const customButtons = useMemo(() => {
    if (!isAdmin) return undefined;
    return {
      createReservation: {
        text: 'Create reservation',
        click: openManualCreate,
      },
    } as any;
  }, [isAdmin, openManualCreate]);

  // ----- drag/resize -----
  const onEventDrop = async (info: any) => {
    if (!isAdmin) {
      info.revert();
      return;
    }
    const ev = info.event;
    const xp: any = ev.extendedProps || {};
    const startIso = ev.start ? ev.start.toISOString() : null;
    const endIso =
      ev.end ? ev.end.toISOString() : ev.start ? new Date(ev.start.getTime() + 60 * 60 * 1000).toISOString() : null;
    if (!startIso || !endIso) {
      info.revert();
      return;
    }

    const payload = {
      groupId: String(ev.id),
      teamId: xp.teamId,
      computerIds: xp.computerIds,
      startsAt: startIso,
      endsAt: endIso,
    };

    try {
      const res = await fetch('/api/reservations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const msg = (await res.json().catch(() => null))?.error || 'Failed to move reservation';
        info.revert();
        alert(msg);
        return;
      }
      await loadReservations();
      scheduleEqualize();
    } catch (e: any) {
      info.revert();
      alert(e?.message || 'Failed to move reservation');
    }
  };

  const onEventResize = async (info: any) => {
    if (!isAdmin) {
      info.revert();
      return;
    }
    const ev = info.event;
    const xp: any = ev.extendedProps || {};
    const startIso = ev.start ? ev.start.toISOString() : null;
    const endIso = ev.end ? ev.end.toISOString() : null;
    if (!startIso || !endIso) {
      info.revert();
      return;
    }

    const payload = {
      groupId: String(ev.id),
      teamId: xp.teamId,
      computerIds: xp.computerIds,
      startsAt: startIso,
      endsAt: endIso,
    };

    try {
      const res = await fetch('/api/reservations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const msg = (await res.json().catch(() => null))?.error || 'Failed to resize reservation';
        info.revert();
        alert(msg);
        return;
      }
      await loadReservations();
      scheduleEqualize();
    } catch (e: any) {
      info.revert();
      alert(e?.message || 'Failed to resize reservation');
    }
  };

  return (
    <div className="p-4">
      {/* Banner */}
      <div className="mb-4 flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <p className="text-sm">{isAdmin ? 'You are signed in as admin.' : 'View only.'}</p>
        {isAdmin ? (
          <div className="flex items-center gap-2">
            <Link
              href="/account/password"
              className="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Change password
            </Link>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })}
              className="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Sign out
            </button>
          </div>
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

      {/* CREATE MODAL (selection OR manual) */}
      {isCreateOpen && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 w-full max-w-md shadow-xl ring-1 ring-black/5">
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
                  <option value="" disabled>
                    Select a team
                  </option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm mb-1">Computer(s)</label>
                  <div className="flex gap-2 text-xs">
                    <button type="button" className="underline" onClick={selectAll}>
                      Select all
                    </button>
                    <button type="button" className="underline" onClick={clearAll}>
                      Clear
                    </button>
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
              </div>

              {!createManual ? (
                <div className="text-xs text-neutral-500">
                  {selectStart && selectEnd
                    ? `Time: ${selectStart.toLocaleString()} → ${selectEnd.toLocaleString()}`
                    : 'Select a slot on the calendar, or click "Create reservation" in the header to enter a time.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-sm mb-1">Starts</label>
                    <input
                      type="datetime-local"
                      className="w-full rounded border px-3 py-2 bg-white dark:bg-neutral-800"
                      value={createStartLocal}
                      onChange={(e) => setCreateStartLocal(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Ends</label>
                    <input
                      type="datetime-local"
                      className="w-full rounded border px-3 py-2 bg-white dark:bg-neutral-800"
                      value={createEndLocal}
                      onChange={(e) => setCreateEndLocal(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

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
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 w-full max-w-md shadow-xl ring-1 ring-black/5">
            <h2 className="text-lg font-semibold mb-3">Reservation details</h2>

            <div className="space-y-2 text-sm">
              <div>
                <span className="text-neutral-500">Title:</span> {detail.title}
              </div>
              <div>
                <span className="text-neutral-500">When:</span> {detail.when}
              </div>
              <div>
                <span className="text-neutral-500">Computer:</span> {detail.computer}
              </div>
              <div>
                <span className="text-neutral-500">Team:</span> {detail.team}
              </div>
              <div>
                <span className="text-neutral-500">Created by:</span> {detail.createdByName}
                {detail.createdByEmail ? ` (${detail.createdByEmail})` : ''}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <button
                type="button"
                className="px-3 py-2 rounded border"
                onClick={() => {
                  setIsDetailsOpen(false);
                  setDetail(null);
                }}
              >
                Close
              </button>

              {isAdmin && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEditTeamId(detail.rawTeamId ?? '');
                      setEditComputerIds(detail.rawComputerIds ?? []);
                      setEditStartLocal(detail.rawStartsAt ? toLocalInputValue(detail.rawStartsAt) : '');
                      setEditEndLocal(detail.rawEndsAt ? toLocalInputValue(detail.rawEndsAt) : '');
                      setIsEditOpen(true);
                    }}
                    className="px-3 py-2 rounded border border-blue-500 text-blue-600 hover:bg-blue-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={deleteReservation}
                    className="px-3 py-2 rounded border border-red-500 text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL (group) */}
      {isEditOpen && detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 w-full max-w-md shadow-xl ring-1 ring-black/5">
            <h2 className="text-lg font-semibold mb-3">Edit reservation</h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!detail) return;
                if (!isAdmin) {
                  alert('Admin only');
                  return;
                }
                if (!editTeamId || editComputerIds.length === 0 || !editStartLocal || !editEndLocal) return;

                const payload = {
                  groupId: detail.id,
                  teamId: editTeamId,
                  computerIds: editComputerIds,
                  startsAt: fromLocalInputValue(editStartLocal),
                  endsAt: fromLocalInputValue(editEndLocal),
                };
                fetch('/api/reservations', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload),
                })
                  .then(async (res) => {
                    const text = await res.text();
                    if (!res.ok) {
                      let msg = 'Failed to update reservation';
                      try {
                        msg = JSON.parse(text)?.error ?? msg;
                      } catch {}
                      throw new Error(msg);
                    }
                  })
                  .then(async () => {
                    setIsEditOpen(false);
                    setIsDetailsOpen(false);
                    setDetail(null);
                    await loadReservations();
                  })
                  .catch((err) => alert(err.message));
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-sm mb-1">Team</label>
                <select
                  value={editTeamId}
                  onChange={(e) => setEditTeamId(e.target.value)}
                  className="w-full rounded border px-3 py-2 bg-white dark:bg-neutral-800"
                  required
                >
                  <option value="" disabled>
                    Select a team
                  </option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1">Computer(s)</label>
                <select
                  multiple
                  value={editComputerIds.map(String)}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, (opt) => Number(opt.value));
                    setEditComputerIds(selected);
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
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-sm mb-1">Starts</label>
                  <input
                    type="datetime-local"
                    className="w-full rounded border px-3 py-2 bg-white dark:bg-neutral-800"
                    value={editStartLocal}
                    onChange={(e) => setEditStartLocal(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Ends</label>
                  <input
                    type="datetime-local"
                    className="w-full rounded border px-3 py-2 bg-white dark:bg-neutral-800"
                    value={editEndLocal}
                    onChange={(e) => setEditEndLocal(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button type="button" className="px-3 py-2 rounded border" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="px-3 py-2 rounded bg-black text-white dark:bg-white dark:text-black">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <FullCalendar
          ref={calendarRef}
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          headerToolbar={headerToolbar as any}
          customButtons={customButtons as any}
          initialView="timeGridWeek"
          selectable={isAdmin}
          selectMirror
          height="auto"
          allDaySlot={false}
          slotMinTime="07:00:00"
          slotMaxTime="24:00:00"
          select={handleSelect}
          eventClick={handleEventClick}
          events={events}
          editable={isAdmin}
          eventStartEditable={isAdmin}
          eventDurationEditable={isAdmin}
          eventResizableFromStart={isAdmin}
          eventDrop={onEventDrop}
          eventResize={onEventResize}
          eventDidMount={() => scheduleEqualize()}
          eventWillUnmount={() => scheduleEqualize()}
          eventsSet={() => scheduleEqualize()}
          datesSet={() => scheduleEqualize()}
        />
      </div>
    </div>
  );
}
