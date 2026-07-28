// Shared helpers for reading the gallery metadata sheet and reasoning about
// collection membership. Imported by data.js and image/[[path]].js.
//
// Starts with "_" and exports no onRequest handler, so Pages does not treat it
// as a route — it is only imported by the real route files.
//
// Membership model: each sheet row has a `collections` cell holding zero or
// more space-separated collection names (e.g. "admin test"). An image belongs
// to a collection if that name appears in the cell. Comparison is
// case-insensitive; names themselves never contain spaces.

// Fetch the metadata sheet JSON. Uses Cloudflare's edge cache so a gallery load
// of hundreds of images (each of which must be membership-checked) collapses to
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

// The set of collection names a row belongs to, lowercased. Tolerates missing
// cells and any run of whitespace between names.
export function rowCollections(row) {
  return String(row && row.collections != null ? row.collections : "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

// Does this row belong to the given collection? Case-insensitive.
export function rowInCollection(row, collection) {
  if (!collection) return false;
  return rowCollections(row).includes(String(collection).toLowerCase());
}

// Turn a sheet image path into the R2 object key the image route receives.
// The sheet stores ".../images/large/Foo.webp"; the R2 key is "large/Foo.webp".
// Mirrors the key derivation in the image route so membership checks line up.
export function keyFromPath(p) {
  if (typeof p !== "string" || !p) return null;
  const marker = "images/";
  const i = p.indexOf(marker);
  const key = i >= 0 ? p.slice(i + marker.length) : p.replace(/^\/+/, "");
  return key || null;
}

// Build the set of R2 keys (all four sizes) reachable with the given collection.
export async function allowedKeys(env, collection) {
  const rows = await fetchSheet(env);
  const keys = new Set();
  for (const row of rows) {
    if (!rowInCollection(row, collection)) continue;
    for (const p of [row.imageTiny, row.imageSmall, row.imageMedium, row.imageLarge]) {
      const k = keyFromPath(p);
      if (k) keys.add(k);
    }
  }
  return keys;
}
