// src/app/api/stream/reservations/route.ts
import { NextResponse } from 'next/server';
import { pgListenPool } from '@/lib/pg';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CHANNEL = 'reservation_events';

export async function GET() {
  const client = await pgListenPool.connect();

  let closed = false;
  let hb: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const sendLine = (line: string) => {
        if (closed) return;
        try {
          controller.enqueue(line);
        } catch {
          // controller already closed
        }
      };
      const sendEvent = (obj: unknown) => {
        sendLine(`data: ${JSON.stringify(obj)}\n\n`);
      };

      const onNotification = (msg: any) => {
        try {
          const payload = JSON.parse(msg.payload);
          sendEvent(payload);
        } catch {
          // ignore malformed payloads
        }
      };

      const cleanup = async () => {
        if (closed) return;
        closed = true;
        if (hb) { clearInterval(hb); hb = null; }
        try { client.off('notification', onNotification); } catch {}
        try { await client.query(`UNLISTEN ${CHANNEL}`); } catch {}
        client.release();
      };

      client.on('notification', onNotification);
      client.query(`LISTEN ${CHANNEL}`).catch((e) => {
        controller.error(e);
        cleanup();
      });

      // kick the stream open for proxies
      sendLine(`: connected\n\n`);

      // heartbeat to keep the connection alive
      hb = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(`: ping\n\n`);
        } catch {
          // stream closed; cleanup
          if (hb) { clearInterval(hb); hb = null; }
          cleanup();
        }
      }, 25_000);

      // If the readable is canceled by the client, clean up.
      // @ts-expect-error - not typed on controller, but Next supports cancel hooks
      controller._close = cleanup;
    },
    async cancel() {
      // @ts-expect-error - paired with start() above
      await this._close?.();
    },
  });

  return new NextResponse(stream as any, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
