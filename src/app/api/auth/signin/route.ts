import { NextResponse } from "next/server";
import { db } from "@/db";
import { keymasters } from "@/db/schema";
import { hashCode } from "@/lib/guard";

export const dynamic = "force-dynamic";

/** Verify a name + employee code against the Keymaster List. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const code = String(body.code ?? "").trim();
  if (!name || !code) {
    return NextResponse.json({ ok: false, error: "Enter your name and employee code." }, { status: 400 });
  }
  let rows;
  try {
    rows = await db.select().from(keymasters);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const notSetUp = /relation .* does not exist/i.test(message);
    console.error("[auth/signin] keymasters query failed:", message);
    return NextResponse.json(
      {
        ok: false,
        error: notSetUp
          ? "Database isn't set up yet — the keymasters table is missing. Run the schema migration (e.g. `npx drizzle-kit push`) against your production database."
          : "Couldn't reach the database. Check DATABASE_URL and try again.",
      },
      { status: 503 },
    );
  }
  if (rows.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No keys registered yet — add the first person in the Keymaster List." },
      { status: 404 },
    );
  }
  const hash = hashCode(code);
  const match = rows.find((r) => r.name.toLowerCase() === name.toLowerCase() && r.codeHash === hash);
  if (!match) {
    return NextResponse.json({ ok: false, error: "Name and employee code do not match." }, { status: 401 });
  }
  return NextResponse.json({ ok: true, name: match.name, role: match.role, unit: match.unit });
}
