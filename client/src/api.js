import * as store from './localStore.js';

// This is a static site with no backend to call — everything runs against
// localStorage, seeded once per browser from the bundled data/family-tree.json.
// Kept as an async, same-shaped API so the rest of the app doesn't care.
async function withSeed(fn) {
  await store.ensureSeeded();
  return fn();
}

export const api = {
  getPeople: () => withSeed(() => store.getAllPeople()),
  createPerson: (data) => withSeed(() => store.createPerson(data)),
  updatePerson: (id, data) => withSeed(() => store.updatePerson(id, data)),
  deletePerson: (id) => withSeed(() => store.deletePerson(id)),

  addRelationship: (type, person1Id, person2Id) =>
    withSeed(() => {
      if (type === 'parent-child') return store.addParentChild(person1Id, person2Id);
      if (type === 'spouse') return store.addSpouses(person1Id, person2Id);
      throw new Error("type must be 'parent-child' or 'spouse'");
    }),
  removeRelationship: (type, person1Id, person2Id) =>
    withSeed(() => {
      if (type === 'parent-child') return store.removeParentChild(person1Id, person2Id);
      if (type === 'spouse') return store.removeSpouses(person1Id, person2Id);
      throw new Error("type must be 'parent-child' or 'spouse'");
    }),

  exportData: () => withSeed(() => store.exportRaw()),

  save: () => withSeed(() => store.saveAndNotify()),
};
