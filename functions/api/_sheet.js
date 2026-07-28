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
const SHEET_CACHE_TTL = 300; // seconds

export async function fetchSheet(env) {
  const res = await fetch(env.SHEET_URL, {
    headers: { Accept: "application/json" },
    cf: { cacheTtl: SHEET_CACHE_TTL, cacheEverything: true },
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
