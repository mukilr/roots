import { Router } from 'express';
import * as store from '../store.js';

export const dataRouter = Router();

// Raw dump of the hierarchical JSON store — the whole point of keeping
// data in one file is that this endpoint (or the file itself) is all
// a future migration script needs to seed a real database.
dataRouter.get('/export', (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="family-tree.json"');
  res.json(store.loadRaw());
});

dataRouter.post('/import', (req, res) => {
  const incoming = req.body;
  if (!incoming || typeof incoming !== 'object' || !incoming.people) {
    return res.status(400).json({ error: 'Expected a JSON object with a "people" map' });
  }
  store.replaceAll(incoming);
  res.json({ ok: true, count: Object.keys(incoming.people).length });
});
