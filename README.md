# Roots

A connected family tree app: add people, link them as parents/children/spouses,
and see the tree rendered live as a D3 force-directed graph, tiered by
generation with ancestors anchored at the bottom.

## Structure

- `server/` — Express API. Data lives in a single hierarchical JSON file at
  `server/data/family-tree.json` (each person record holds `parentIds`,
  `childrenIds`, `spouseIds`). Since every record is already a self-contained
  row, migrating to a real database later is just a script that reads this
  file and inserts into `people` + `person_relationships` tables — no
  reshaping needed. `GET /api/data/export` returns the raw file for that
  purpose.
- `client/` — React (Vite) app. The tree is rendered with `d3-force`: each
  person's generation is computed from parent/child links and pinned to a
  fixed row, while the simulation handles horizontal spacing within each row.

## Running locally

In two terminals:

```bash
cd server && npm install && npm run dev
```

```bash
cd client && npm install && npm run dev
```

Then open the client dev server URL (Vite prints it, typically
`http://localhost:5173`). The client proxies `/api` to the server on port
4000.

## API

- `GET/POST /api/people`, `GET/PUT/DELETE /api/people/:id`
- `POST /api/relationships` — `{ type: 'parent-child' | 'spouse', person1Id, person2Id }`
  (for `parent-child`, `person1Id` is the parent)
- `DELETE /api/relationships` — same body, unlinks
- `GET /api/tree` — people transformed into a parents/children/siblings/spouses shape
- `GET /api/data/export` / `POST /api/data/import` — raw JSON dump/restore of the whole store
