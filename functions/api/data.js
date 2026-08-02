// GET /api/data
// Gated proxy for the gallery metadata. Verifies the session cookie, reads the
// access label it grants, then returns only the sheet rows that grant that
// label. The upstream URL lives in the SHEET_URL secret, so it never ships in
// the client bundle and the data is only reachable with a valid session.

import { readToken, getCookie, COOKIE_NAME } from "./_auth.js";
import { fetchSheet, rowHasAccess } from "./_sheet.js";

export async function onRequestGet({ request, env }) {
  const session = await readToken(env.SESSION_SECRET, getCookie(request, COOKIE_NAME));
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!env.SHEET_URL) {
    return new Response("Server not configured", { status: 500 });
  }

  // Editing escape hatch: /api/data?fresh=1 skips the edge cache so a sheet
  // change shows up now instead of waiting out SHEET_CACHE_TTL. It sits below
  // the session check, so it is not an open pipe to Apps Script — only someone
  // who already has a passcode can reach it, and they could force the same
  // origin traffic just by reloading past each TTL anyway.
  const fresh = new URL(request.url).searchParams.has("fresh");

  let rows;
  try {
    rows = await fetchSheet(env, { fresh });
  } catch {
    return new Response("Upstream error", { status: 502 });
  }

  // Keep only rows this session's label can access, and drop the `access` field
  // so the client never learns which other labels an image is exposed to.
  const visible = rows
    .filter((row) => rowHasAccess(row, session.access))
    .map(({ access, ...rest }) => rest);

  return new Response(JSON.stringify(visible), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      // A deliberately fresh read that the browser then held for a minute would
      // defeat itself on the very next reload.
      "Cache-Control": fresh ? "no-store" : "private, max-age=60",
    },
  });
}
