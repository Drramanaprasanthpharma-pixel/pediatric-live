import { NextResponse } from "next/server";

/**
 * Edit guard: every mutating request must carry a non-empty `x-editor`
 * header (the signed-in staff name). Without it the API refuses the write,
 * so records can only be viewed — never changed — by an unsigned session.
 */
export function editorOf(req: Request): string {
  return (req.headers.get("x-editor") || "").trim();
}

export function unsigned() {
  return NextResponse.json(
    { error: "View-only: enter your name in “Signed as” to edit & save." },
    { status: 401 },
  );
}
