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
      "DATABASE_URL is required. Set it in your environment (or your Vercel project's Environment Variables) and redeploy."
    );
  }

  const newPool = new Pool({ connectionString: databaseUrl });

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
