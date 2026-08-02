# Gallery

A passcode-gated image gallery: a Vite + React SPA served by Cloudflare Pages,
with Pages Functions in `functions/api/` gating both the metadata and the image
bytes. Images live in a private R2 bucket and have no public URL.

## Local development

```sh
npm install
cp .dev.vars.example .dev.vars   # then fill in the real values
npm run dev:full                 # http://localhost:8788
```

- `npm run dev:full` runs `wrangler pages dev` in front of Vite, so the
  `/api/*` Functions and the R2 image binding work. **Use this for anything
  touching login or images.**
- `npm run dev` runs Vite alone on port 5173. Faster, but every `/api/*` call
  404s, so the gallery cannot log in.

`.dev.vars` holds your local secrets and is gitignored — see
[`.dev.vars.example`](.dev.vars.example) for the three required variables and
their formats. Without it, login returns a 500 "Server not configured".
Wrangler reads the file at startup, so restart `dev:full` after editing it.

Both scripts kill anything already listening on their ports first (via the
`predev` / `predev:full` hooks), so a stale dev server from a previous session
can't wedge the next start.

### Sheet columns

Three columns describe how a row appears in the category chooser, and they share
one convention: **they are comma-separated lists, and slot _i_ of each refers to
category _i_.**

| Column | Holds | Effect |
| --- | --- | --- |
| `category` | Category names | Which tiles the row appears under |
| `cat_order` | Sort numbers | Where each of those tiles sits in the chooser |
| `cover` | Flags (`x` / `TRUE` / `1`) | Which of those tiles uses this row's image |

```
category   = "Graphic Design, Digest"
cat_order  = "2, 1"
cover      = ", x"
```

That row appears under both tiles, ranks 2nd among Graphic Design's rows and 1st
among Digest's, and is Digest's cover image but not Graphic Design's. Without
per-slot values none of that is expressible: a best-of category shares nearly
every row with the categories it draws from, so one number and one flag per row
could only ever apply to all of them at once.

Rules that apply to `cat_order` and `cover`:

- **A value with no comma broadcasts** to every category on the row. This is the
  original behaviour, so rows that predate the list form keep working.
- **A blank slot means "unset"** — unnumbered, or not a cover. It does not
  collapse, so `", x"` puts the flag on the *second* category.
- **Short lists are fine.** Categories the list didn't reach are simply unset.
- **Unparseable values are ignored** rather than erroring, so a category that
  mysteriously sorts last usually means its number didn't survive as text.

A category's chooser position is the **minimum** `cat_order` claimed across the
rows the current passcode can see; anything unnumbered sorts last, alphabetically
among itself. Filling the same number down a category's whole block keeps its
position stable for every passcode. Its cover is the earliest claiming row in
sheet order, falling back to its first visible row so a tile always renders.

Category names are matched case-insensitively and deduped, with first-seen
casing winning. Names may contain spaces; `access` labels may not.

> Format these columns as **Plain text** in Sheets. A value like `4, 1` or
> `March, April` in a date-formatted cell gets silently reinterpreted, and the
> symptom is a category quietly sorting to the bottom rather than an error.

### Access model

Each passcode maps to exactly one access label; each image row in the sheet
carries zero or more space-separated labels in its `access` column. A session
sees an image only if its label appears in that image's cell — enforced twice,
once for metadata (`/api/data`) and again for the bytes (`/api/image/*`).

The passcode → label map lives only in the `GALLERY_PASSCODES` secret, so the
link between a passcode and what it unlocks exists in exactly one place. The
label travels in a signed HttpOnly cookie the client can neither read nor forge.

### Sheet caching

Every image request re-checks access against the sheet, so a single gallery load
would otherwise hit Apps Script once per image. `fetchSheet` collapses that to
roughly one origin request per `SHEET_CACHE_TTL` (30s) using Cloudflare's edge
cache.

That cache lives between the Worker and Apps Script, so **the browser cannot
bypass it** — a hard refresh gets you a fresh Worker run reading the same cached
sheet. After editing the sheet, either wait out the TTL or load the gallery as:

```
https://<your-site>/?fresh=1
```

which forwards the flag to `/api/data?fresh=1` and skips the cache for that
read. Both need a valid session like any other `/api/*` call.

The TTL clock belongs to the *cache entry*, not to you: it starts when a request
finds the cache empty, and reads don't extend it. Since every `/api/image/*`
request consults the sheet too, another viewer scrolling the gallery restarts it
just as surely as a reload of your own. So "I last refreshed 30s ago" does not
imply a fresh read — `?fresh=1` is the only guarantee.

The bypass uses a throwaway cache key, so it refreshes the metadata this load
sees without repopulating the canonical entry. Ordering, naming and `cat_order`
edits are therefore fully covered; a brand-new image can still 404 until the TTL
lapses, because `/api/image/*` is still resolving against the cached sheet.

## Scripts

| Script | Does |
| --- | --- |
| `npm run dev:full` | Full stack: Functions + R2 + Vite, on `:8788` |
| `npm run dev` | Vite only, on `:5173` (no `/api/*`) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
| `npm run generate-colors` | Regenerate `src/generated-colors.css` from `src/colors-rggd.ase` |

## Deployment

Cloudflare Pages builds and deploys from the repo. Production secrets and
bindings come from the Cloudflare dashboard and are entirely separate from
`.dev.vars`; `wrangler.jsonc` is local-only and gitignored, so it never affects
the production build.
