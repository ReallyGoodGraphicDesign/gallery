// GET /api/image/<size>/<filename>.webp
// The gate: verifies the session cookie AND that the requested image is exposed
// to the session's access label, THEN streams the object from the private R2
// bucket (binding: IMAGES). Without a valid cookie you get 401; with a valid
// cookie whose label doesn't cover the image you get 404 — either way you never
// reach the file, and there is no public URL for these images.

import { readToken, getCookie, COOKIE_NAME } from "../_auth.js";
import { allowedKeys } from "../_sheet.js";

export async function onRequestGet({ request, env, params }) {
  // 1. auth — must have a valid session with an access label
  const session = await readToken(env.SESSION_SECRET, getCookie(request, COOKIE_NAME));
  if (!session) {
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

  // 4. authorize the key against the session's access label. Access lives in the
  // sheet, not the path, so we resolve the label's reachable keys (edge-cached)
  // and treat anything outside that set as if it doesn't exist.
  let keys;
  try {
    keys = await allowedKeys(env, session.access);
  } catch {
    return new Response("Upstream error", { status: 502 });
  }
  if (!keys.has(key)) {
    return new Response("Not found", { status: 404 });
  }

  // 5. fetch from R2 and stream back
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
