# Roots

A connected family tree app: add people, link them as parents/children/spouses,
and see the tree rendered live as a D3 force-directed graph, tiered by
generation with ancestors anchored at the bottom.

The published site (GitHub Pages) is fully static and runs entirely in the
browser — there's no live backend to talk to once deployed.

## Structure

- `client/public/data/family-tree.json` — the single canonical data file,
  shared by both halves of the project. Each person record holds `parentIds`,
  `childrenIds`, `spouseIds`, so it's already shaped to map 1:1 onto tables in
  a future real database (`people` + `person_relationships`) if that's ever
  needed.
- `server/` — an Express API for **local editing only**. It reads/writes the
  same `client/public/data/family-tree.json` file, so you can use it to build
  up a tree with a proper form-driven UI before publishing.
- `client/` — the React (Vite) app. On a fresh visit, it fetches the bundled
  `data/family-tree.json` once and seeds `localStorage` with it; every edit
  after that reads/writes `localStorage` directly, since a static site has no
  server to persist changes to. Each change also opens a pre-filled email
  draft to `mukilr@gmail.com` (via `mailto:`) with the updated JSON, so
  changes made by visitors can be reviewed and folded back into the published
  seed at your leisure. People with unsynced local edits show a ⏳ badge.

## Running locally (full CRUD, via the Express API)

In two terminals:

```bash
cd server && npm install && npm run dev
```

```bash
cd client && npm install && npm run dev
```

This is the old-style API-driven mode, useful for bulk-editing the canonical
seed file before publishing. Note: the client itself doesn't call this API —
edit `client/public/data/family-tree.json` via the server's endpoints, then
rebuild/redeploy to publish the update.

## Previewing the static build locally

```bash
cd client && npm install && npm run dev
```

The client always runs standalone off `localStorage` + the bundled seed —
no server required for normal browsing/editing.

## Deploying to GitHub Pages

```bash
cd client && npm run deploy
```

This builds the app (bundling whatever is currently in
`client/public/data/family-tree.json`) and pushes `dist/` to the `gh-pages`
branch. First time only: in the GitHub repo, go to **Settings → Pages** and
set the source to the `gh-pages` branch.

**Privacy note:** whatever is in `family-tree.json` at deploy time becomes
part of the public site (GitHub Pages sites are public on free plans). Keep
the committed seed as a placeholder/empty file if you don't want real family
data published — visitors' own edits stay local to their browser and only
reach you via the emailed updates.

## Server API (local dev only)

- `GET/POST /api/people`, `GET/PUT/DELETE /api/people/:id`
- `POST /api/relationships` — `{ type: 'parent-child' | 'spouse', person1Id, person2Id }`
  (for `parent-child`, `person1Id` is the parent)
- `DELETE /api/relationships` — same body, unlinks
- `GET /api/tree` — people transformed into a parents/children/siblings/spouses shape
- `GET /api/data/export` / `POST /api/data/import` — raw JSON dump/restore of the whole store
