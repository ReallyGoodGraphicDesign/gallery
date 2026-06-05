// GET /api/data
// Gated proxy for the gallery metadata. Verifies the session cookie, then
// fetches the Google Apps Script endpoint server-side and returns its JSON.
// The upstream URL lives in the SHEET_URL secret, so it never ships in the
// client bundle and the data is only reachable with a valid session.

import { verifyToken, getCookie, COOKIE_NAME } from "./_auth.js";

export async function onRequestGet({ request, env }) {
  if (!(await verifyToken(env.SESSION_SECRET, getCookie(request, COOKIE_NAME)))) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!env.SHEET_URL) {
    return new Response("Server not configured", { status: 500 });
  }

  // Apps Script 302-redirects to script.googleusercontent.com; fetch follows
  // redirects by default.
  const upstream = await fetch(env.SHEET_URL, {
    headers: { Accept: "application/json" },
  });
  if (!upstream.ok) {
    return new Response("Upstream error", { status: 502 });
  }

  const body = await upstream.text();
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, max-age=60",
    },
  });
}
