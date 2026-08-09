import { Router } from 'express';
import * as store from '../store.js';

export const relationshipsRouter = Router();

function handleStoreError(res, err) {
  const status = err.status || 500;
  res.status(status).json({ error: err.message });
}

// body: { type: 'parent-child' | 'spouse', person1Id, person2Id }
// parent-child: person1Id is the parent, person2Id is the child
// spouse: person1Id and person2Id are linked as spouses
relationshipsRouter.post('/', (req, res) => {
  const { type, person1Id, person2Id } = req.body;
  if (!type || !person1Id || !person2Id) {
    return res.status(400).json({ error: 'type, person1Id and person2Id are required' });
  }
  try {
    if (type === 'parent-child') {
      const { parent, child } = store.addParentChild(String(person1Id), String(person2Id));
      res.status(201).json({ parent, child });
    } else if (type === 'spouse') {
      const { p1, p2 } = store.addSpouses(String(person1Id), String(person2Id));
      res.status(201).json({ p1, p2 });
    } else {
      res.status(400).json({ error: "type must be 'parent-child' or 'spouse'" });
    }
  } catch (err) {
    handleStoreError(res, err);
  }
});

relationshipsRouter.delete('/', (req, res) => {
  const { type, person1Id, person2Id } = req.body;
  if (!type || !person1Id || !person2Id) {
    return res.status(400).json({ error: 'type, person1Id and person2Id are required' });
  }
  try {
    if (type === 'parent-child') {
      store.removeParentChild(String(person1Id), String(person2Id));
    } else if (type === 'spouse') {
      store.removeSpouses(String(person1Id), String(person2Id));
    } else {
      return res.status(400).json({ error: "type must be 'parent-child' or 'spouse'" });
    }
    res.status(204).end();
  } catch (err) {
    handleStoreError(res, err);
  }
});
