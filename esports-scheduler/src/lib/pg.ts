// src/lib/pg.ts
import { Pool, type ClientConfig } from 'pg';

declare global {
  // avoid creating multiple pools in Next dev (HMR)
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var _pgListenPool: Pool | undefined;
}

const mainUrl = process.env.DATABASE_URL!;
const listenUrl = process.env.DATABASE_URL_LISTEN || mainUrl;

function cfg(url: string): ClientConfig {
  return {
    connectionString: url,
    // Neon & many managed PGs require SSL; honor `sslmode=require` in the URL
    ssl: url.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
    // keepalive helps long-lived LISTEN connections
    keepAlive: true,
  };
}

// Primary pool for normal Prisma/queries (UNCHANGED behavior)
export const pgPool =
  global._pgPool ?? new Pool(cfg(mainUrl));

if (process.env.NODE_ENV !== 'production') {
  global._pgPool = pgPool;
}

// Dedicated pool for LISTEN/NOTIFY (use DIRECT host in DATABASE_URL_LISTEN)
export const pgListenPool =
  global._pgListenPool ??
  new Pool({
    ...cfg(listenUrl),
    // small cap; each SSE stream takes one connection until closed
    max: 5,
  });

if (process.env.NODE_ENV !== 'production') {
  global._pgListenPool = pgListenPool;
}
