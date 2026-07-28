// GET /api/data
// Gated proxy for the gallery metadata. Verifies the session cookie, reads the
// collection it grants, then returns only the sheet rows tagged with that
// collection. The upstream URL lives in the SHEET_URL secret, so it never ships
// in the client bundle and the data is only reachable with a valid session.

import { readToken, getCookie, COOKIE_NAME } from "./_auth.js";
import { fetchSheet, rowInCollection } from "./_sheet.js";

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

  // Keep only rows in this session's collection, and drop the `collections`
  // field so the client never learns which other collections an image is in.
  const visible = rows
    .filter((row) => rowInCollection(row, session.collection))
    .map(({ collections, ...rest }) => rest);

  return new Response(JSON.stringify(visible), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, max-age=60",
    },
  });
}
