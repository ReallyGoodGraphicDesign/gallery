// GET /api/session
// Lightweight check the SPA calls on load to know if there's a valid session
// (replaces the old localStorage "gallery-authed" flag). 200 = authed.

import { verifyToken, getCookie, COOKIE_NAME } from "./_auth.js";

export async function onRequestGet({ request, env }) {
  const token = getCookie(request, COOKIE_NAME);
  const authed = await verifyToken(env.SESSION_SECRET, token);
  return new Response(JSON.stringify({ authed }), {
    status: authed ? 200 : 401,
    headers: { "Content-Type": "application/json" },
  });
}
