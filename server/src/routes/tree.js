import { Router } from 'express';
import * as store from '../store.js';

export const treeRouter = Router();

// Transforms the flat, file-backed people store into the node shape
// react-family-tree expects: { id, gender, parents, children, siblings, spouses }
treeRouter.get('/', (req, res) => {
  const people = store.getAllPeople();
  const byId = Object.fromEntries(people.map((p) => [p.id, p]));

  const nodes = people.map((person) => {
    const parents = person.parentIds.map((id) => ({ id, type: 'blood' }));
    const children = person.childrenIds.map((id) => ({ id, type: 'blood' }));
    const spouses = person.spouseIds.map((id) => ({ id, type: 'married' }));

    const parentSet = new Set(person.parentIds);
    const siblingIds = new Set();
    for (const parentId of person.parentIds) {
      const parent = byId[parentId];
      if (!parent) continue;
      for (const siblingId of parent.childrenIds) {
        if (siblingId !== person.id) siblingIds.add(siblingId);
      }
    }
    const siblings = [...siblingIds].map((id) => {
      const sibling = byId[id];
      const sharesAllParents =
        sibling &&
        sibling.parentIds.length === person.parentIds.length &&
        sibling.parentIds.every((pid) => parentSet.has(pid));
      return { id, type: sharesAllParents ? 'blood' : 'half' };
    });

    return {
      id: person.id,
      gender: person.gender,
      parents,
      children,
      siblings,
      spouses,
    };
  });

  res.json(nodes);
});
