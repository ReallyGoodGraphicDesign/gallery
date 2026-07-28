// Shared auth helpers for the gallery's gated Functions.
//
// A session is a signed token: base64url(payload) + "." + base64url(HMAC).
// The HMAC is computed with SESSION_SECRET using the Workers runtime's
// built-in Web Crypto — no third-party dependency, nothing to bundle.
//
// This file starts with "_" and exports no onRequest handler, so Pages does
// not treat it as a route; it is only imported by the real route files.

export const COOKIE_NAME = "rggd_session";
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

const encoder = new TextEncoder();

function bytesToB64url(bytes) {
  const arr = new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToBytes(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const bin = atob(str);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

// Create a signed session token that expires in SESSION_TTL_SECONDS. Any extra
// claims (e.g. { collection: "admin" }) are folded into the signed payload, so
// the client cannot read or forge them.
export async function createToken(secret, claims = {}) {
  const payload = { ...claims, exp: Date.now() + SESSION_TTL_SECONDS * 1000 };
  const payloadB64 = bytesToB64url(encoder.encode(JSON.stringify(payload)));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadB64));
  return `${payloadB64}.${bytesToB64url(sig)}`;
}

// Verify signature AND expiry, returning the decoded payload on success or null
// on any failure. Callers that need the collection claim use this; callers that
// only need a yes/no use verifyToken below.
export async function readToken(secret, token) {
  if (!secret || !token || typeof token !== "string") return null;
  const [payloadB64, sigB64] = token.split(".");
  if (!payloadB64 || !sigB64) return null;

  const key = await hmacKey(secret);
  // crypto.subtle.verify is constant-time, so this is safe against timing attacks.
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    b64urlToBytes(sigB64),
    encoder.encode(payloadB64)
  );
  if (!valid) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(payloadB64)));
    if (typeof payload.exp !== "number" || Date.now() >= payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// Verify signature AND expiry. Returns true only if both pass.
export async function verifyToken(secret, token) {
  return (await readToken(secret, token)) !== null;
}

// Pull a single cookie value out of the request's Cookie header.
export function getCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i === -1) continue;
    if (part.slice(0, i).trim() === name) {
      return decodeURIComponent(part.slice(i + 1).trim());
    }
  }
  return null;
}

// Build the Set-Cookie header value for a session (or to clear one).
// Only mark cookies Secure for HTTPS requests; local Pages dev runs over HTTP,
// and browsers reject Secure cookies there.
export function sessionCookie(token, { clear = false, secure = false } = {}) {
  const maxAge = clear ? 0 : SESSION_TTL_SECONDS;
  const secureAttr = secure ? "; Secure" : "";
  return `${COOKIE_NAME}=${clear ? "" : token}; HttpOnly${secureAttr}; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}
