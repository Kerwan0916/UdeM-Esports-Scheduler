import { NextResponse } from 'next/server';
import { pgPool } from '@/lib/pg';

export const runtime = 'nodejs';
const CHANNEL = 'reservation_events';

export async function GET() {
  const client = await pgPool.connect();

  const stream = new ReadableStream({
    start(controller) {
      const send = (obj: any) => {
        controller.enqueue(
          `data: ${JSON.stringify(obj)}\n\n`
        );
      };

      const onNotification = (msg: any) => {
        try {
          const payload = JSON.parse(msg.payload);
          send(payload);
        } catch {
          // ignore malformed payloads
        }
      };

      client.on('notification', onNotification);

      client.query(`LISTEN ${CHANNEL}`).catch((e) => {
        controller.error(e);
      });

      // heartbeat (keeps connections/proxies alive)
      const hb = setInterval(() => controller.enqueue(`: ping\n\n`), 25000);

      // cleanup
      const close = async () => {
        clearInterval(hb);
        client.off('notification', onNotification);
        try { await client.query(`UNLISTEN ${CHANNEL}`); } catch {}
        client.release();
      };

      // when client closes the stream
      (controller as any).close = close;
    },
    cancel(reason) {
      // @ts-ignore
      this.close?.();
    },
  });

  return new NextResponse(stream as any, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
