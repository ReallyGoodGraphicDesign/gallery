// Shared helpers for reading the gallery metadata sheet and reasoning about
// access. Imported by data.js and image/[[path]].js.
//
// Starts with "_" and exports no onRequest handler, so Pages does not treat it
// as a route — it is only imported by the real route files.
//
// Access model: each sheet row has an `access` cell holding zero or more
// space-separated access labels (e.g. "admin test"). A passcode is mapped to
// one such label in the GALLERY_PASSCODES secret; the passcode can see an image
// only if its label appears in that image's `access` cell. Comparison is
// case-insensitive; labels themselves never contain spaces.

// Fetch the metadata sheet JSON. Uses Cloudflare's edge cache so a gallery load
// of hundreds of images (each of which must be access-checked) collapses to
// roughly one origin request every SHEET_CACHE_TTL seconds instead of one per
// image. Apps Script 302-redirects to script.googleusercontent.com; fetch
// follows redirects by default.
//
// The amplification this defends against happens inside a single page load — a
// burst lasting seconds — so the TTL only has to outlast that burst, not run
// for minutes. 30s collapses a page load to the same ~1 origin request 300s
// did, while cutting how long a sheet edit stays invisible by 10x. The cost is
// only an extra origin hit when a load lands more than 30s after the last one.
//
// Note this is a server-to-server fetch, so nothing the browser does — hard
// refresh, cleared site data, incognito — reaches this cache. Editing the sheet
// and wanting to see it now is what the `fresh` option below is for.
const SHEET_CACHE_TTL = 30; // seconds

export async function fetchSheet(env, { fresh = false } = {}) {
  // Busting means a different cache KEY: an entry already stored under the
  // plain URL can't be read past any other way. The consequence is that the
  // fresh response lands under a throwaway key and does NOT refresh the
  // canonical entry the image route reads — that one still lapses on its own
  // TTL. Harmless for edits to ordering or text, which touch no image keys; a
  // brand-new image can still 404 for up to SHEET_CACHE_TTL, which is the other
  // reason to keep that number small.
  const url = fresh
    ? `${env.SHEET_URL}${env.SHEET_URL.includes("?") ? "&" : "?"}_fresh=${Date.now()}`
    : env.SHEET_URL;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cf: fresh
      ? { cacheTtl: 0, cacheEverything: false }
      : { cacheTtl: SHEET_CACHE_TTL, cacheEverything: true },
  });
  if (!res.ok) throw new Error(`sheet upstream ${res.status}`);
  return res.json();
}

// The access labels a row carries, lowercased. Tolerates missing cells and any
// run of whitespace between labels.
export function rowAccessLabels(row) {
  return String(row && row.access != null ? row.access : "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

// Does this row grant access to the given label? Case-insensitive.
export function rowHasAccess(row, access) {
  if (!access) return false;
  return rowAccessLabels(row).includes(String(access).toLowerCase());
}

// Turn a sheet image path into the R2 object key the image route receives.
// The sheet stores ".../images/large/Foo.webp"; the R2 key is "large/Foo.webp".
// Mirrors the key derivation in the image route so access checks line up.
export function keyFromPath(p) {
  if (typeof p !== "string" || !p) return null;
  const marker = "images/";
  const i = p.indexOf(marker);
  const key = i >= 0 ? p.slice(i + marker.length) : p.replace(/^\/+/, "");
  return key || null;
}

// Build the set of R2 keys (all four sizes) reachable with the given access label.
export async function allowedKeys(env, access) {
  const rows = await fetchSheet(env);
  const keys = new Set();
  for (const row of rows) {
    if (!rowHasAccess(row, access)) continue;
    for (const p of [row.imageTiny, row.imageSmall, row.imageMedium, row.imageLarge]) {
      const k = keyFromPath(p);
      if (k) keys.add(k);
    }
  }
  return keys;
}
