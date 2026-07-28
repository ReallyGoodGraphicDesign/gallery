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

  let rows;
  try {
    rows = await fetchSheet(env);
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
      "Cache-Control": "private, max-age=60",
    },
  });
}
