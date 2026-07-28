// POST /api/login  { password }
// Checks the typed passcode against the GALLERY_PASSCODES secret and, on a
// match, sets a signed HttpOnly session cookie carrying that passcode's
// collection name.
//
// GALLERY_PASSCODES is a JSON object mapping each passcode to the single
// collection it unlocks, e.g. {"s3cret-a":"family","s3cret-b":"clients"}.
// It lives only in the server-side secret — never in the sheet or the bundle —
// so the passcode <-> collection link exists in exactly one place.

import { createToken, sessionCookie } from "./_auth.js";

export async function onRequestPost({ request, env }) {
  if (!env.GALLERY_PASSCODES || !env.SESSION_SECRET) {
    return json({ ok: false, error: "Server not configured" }, 500);
  }

  let passcodes;
  try {
    passcodes = JSON.parse(env.GALLERY_PASSCODES);
  } catch {
    return json({ ok: false, error: "Server not configured" }, 500);
  }
  if (!passcodes || typeof passcodes !== "object") {
    return json({ ok: false, error: "Server not configured" }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const passcode = body && typeof body.password === "string" ? body.password : "";
  // Exact-match lookup: passcodes are secrets, so they are case-sensitive.
  const collection =
    passcode && Object.prototype.hasOwnProperty.call(passcodes, passcode)
      ? passcodes[passcode]
      : null;
  if (!collection || typeof collection !== "string") {
    return json({ ok: false }, 401);
  }

  const token = await createToken(env.SESSION_SECRET, { collection });
  const isSecure = new URL(request.url).protocol === "https:";
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": sessionCookie(token, { secure: isSecure }),
    },
  });
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
