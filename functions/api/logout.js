// POST /api/logout
// Clears the session cookie.

import { sessionCookie } from "./_auth.js";

export async function onRequestPost({ request }) {
  const isSecure = new URL(request.url).protocol === "https:";
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": sessionCookie(null, { clear: true, secure: isSecure }),
    },
  });
}
