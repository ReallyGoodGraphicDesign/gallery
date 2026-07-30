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

### Access model

Each passcode maps to exactly one access label; each image row in the sheet
carries zero or more space-separated labels in its `access` column. A session
sees an image only if its label appears in that image's cell — enforced twice,
once for metadata (`/api/data`) and again for the bytes (`/api/image/*`).

The passcode → label map lives only in the `GALLERY_PASSCODES` secret, so the
link between a passcode and what it unlocks exists in exactly one place. The
label travels in a signed HttpOnly cookie the client can neither read nor forge.

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
