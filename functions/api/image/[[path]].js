// GET /api/image/<size>/<filename>.webp
// The gate: verifies the session cookie, THEN streams the object from the
// private R2 bucket (binding: IMAGES). Without a valid cookie you get 401 and
// never reach the file — there is no public URL for these images anymore.

import { verifyToken, getCookie, COOKIE_NAME } from "../_auth.js";

export async function onRequestGet({ request, env, params }) {
  // 1. auth
  const token = getCookie(request, COOKIE_NAME);
  if (!(await verifyToken(env.SESSION_SECRET, token))) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 2. build the R2 key from the catch-all path segments
  const segments = Array.isArray(params.path) ? params.path : [params.path];
  let key;
  try {
    key = segments.map((s) => decodeURIComponent(s)).join("/");
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  // 3. guard against path traversal / empty keys
  if (!key || key.includes("..") || key.startsWith("/")) {
    return new Response("Bad request", { status: 400 });
  }

  // 4. fetch from R2 and stream back
  const object = await env.IMAGES.get(key);
  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers); // sets Content-Type if stored on the object
  headers.set("etag", object.httpEtag);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "image/webp");
  // private: tied to a logged-in session, so don't let shared caches keep it
  headers.set("Cache-Control", "private, max-age=3600");

  return new Response(object.body, { headers });
}
