import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

function getPool(): Pool {
  if (globalForDb.__arenaNextJsPostgresqlPool) {
    return globalForDb.__arenaNextJsPostgresqlPool;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    // Thrown lazily (on first query) instead of at module import time, so
    // `next build` doesn't crash while collecting page data when the env
    // var isn't present yet (e.g. before it's configured in Vercel).
    throw new Error(
      "DATABASE_URL is required. Set it in your environment (or your Vercel project's Environment Variables) and redeploy.",
    );
  }

  // Most managed Postgres providers used behind Vercel (Neon, Supabase,
  // Railway, Vercel Postgres, etc.) require TLS, and node-postgres won't
  // negotiate their certificate chain unless SSL is explicitly configured —
  // without this, connections fail with an opaque "self signed certificate"
  // / connection error rather than a clear message. Skip it only if the
  // connection string explicitly opts out (sslmode=disable), e.g. local dev.
  const wantsNoSsl = /sslmode=disable/i.test(databaseUrl);
  const newPool = new Pool({
    connectionString: databaseUrl,
    ssl: wantsNoSsl ? undefined : { rejectUnauthorized: false },
  });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.__arenaNextJsPostgresqlPool = newPool;
  }

  return newPool;
}

export const pool = new Proxy({} as Pool, {
  get(_target, prop, receiver) {
    const actual = getPool();
    return Reflect.get(actual, prop, actual);
  },
});

export const db = drizzle({ client: pool });
