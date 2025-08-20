// src/lib/pg.ts
import { Pool } from 'pg';

declare global {
  // avoid creating multiple pools in Next dev (HMR)
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

const connectionString = process.env.DATABASE_URL!;

export const pgPool =
  global._pgPool ??
  new Pool({
    connectionString,
    ssl: connectionString.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : undefined,
  });

if (process.env.NODE_ENV !== 'production') {
  global._pgPool = pgPool;
}
