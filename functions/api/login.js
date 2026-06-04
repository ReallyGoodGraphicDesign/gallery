// POST /api/login  { password }
// Checks the password against the GALLERY_PASSWORD secret (server-side only)
// and, on success, sets a signed HttpOnly session cookie.

import { createToken, sessionCookie } from "./_auth.js";

export async function onRequestPost({ request, env }) {
  if (!env.GALLERY_PASSWORD || !env.SESSION_SECRET) {
    return json({ ok: false, error: "Server not configured" }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const password = body && typeof body.password === "string" ? body.password : "";
  if (password !== env.GALLERY_PASSWORD) {
    return json({ ok: false }, 401);
  }

  const token = await createToken(env.SESSION_SECRET);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": sessionCookie(token),
    },
  });
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
