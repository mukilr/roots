import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Single hierarchical JSON file is the source of truth. Each person record
// is a self-contained row (parentIds/childrenIds/spouseIds are the only
// links) so it maps 1:1 onto tables in a future real database:
// people(id, first_name, ...) + person_relationships(person_id, related_id, type).
export const DATA_FILE = path.join(__dirname, '..', 'data', 'family-tree.json');

// The data file holds personal family data and is gitignored, so a fresh
// clone won't have one yet — bootstrap it on first run.
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ nextId: 1, people: {} }, null, 2));
}

function load() {
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(raw);
}

function save(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

export function getAllPeople() {
  const data = load();
  return Object.values(data.people);
}

export function getPerson(id) {
  const data = load();
  return data.people[id] || null;
}

export function createPerson(fields) {
  const data = load();
  const id = String(data.nextId++);
  const person = {
    id,
    firstName: fields.firstName,
    lastName: fields.lastName || '',
    gender: fields.gender,
    birthDate: fields.birthDate || null,
    deathDate: fields.deathDate || null,
    photoUrl: fields.photoUrl || null,
    notes: fields.notes || null,
    parentIds: [],
    childrenIds: [],
    spouseIds: [],
  };
  data.people[id] = person;
  save(data);
  return person;
}

export function updatePerson(id, fields) {
  const data = load();
  const existing = data.people[id];
  if (!existing) return null;
  const updated = {
    ...existing,
    ...fields,
    id: existing.id,
    parentIds: existing.parentIds,
    childrenIds: existing.childrenIds,
    spouseIds: existing.spouseIds,
  };
  data.people[id] = updated;
  save(data);
  return updated;
}

export function deletePerson(id) {
  const data = load();
  if (!data.people[id]) return false;

  for (const person of Object.values(data.people)) {
    person.parentIds = person.parentIds.filter((pid) => pid !== id);
    person.childrenIds = person.childrenIds.filter((cid) => cid !== id);
    person.spouseIds = person.spouseIds.filter((sid) => sid !== id);
  }
  delete data.people[id];
  save(data);
  return true;
}

function assertExists(data, id) {
  if (!data.people[id]) {
    const err = new Error(`Person ${id} not found`);
    err.status = 404;
    throw err;
  }
}

export function addParentChild(parentId, childId) {
  const data = load();
  assertExists(data, parentId);
  assertExists(data, childId);
  if (parentId === childId) {
    const err = new Error('A person cannot be their own parent');
    err.status = 400;
    throw err;
  }
  const parent = data.people[parentId];
  const child = data.people[childId];
  if (!child.parentIds.includes(parentId)) child.parentIds.push(parentId);
  if (!parent.childrenIds.includes(childId)) parent.childrenIds.push(childId);
  save(data);
  return { parent, child };
}

export function removeParentChild(parentId, childId) {
  const data = load();
  assertExists(data, parentId);
  assertExists(data, childId);
  data.people[parentId].childrenIds = data.people[parentId].childrenIds.filter((id) => id !== childId);
  data.people[childId].parentIds = data.people[childId].parentIds.filter((id) => id !== parentId);
  save(data);
}

export function addSpouses(person1Id, person2Id) {
  const data = load();
  assertExists(data, person1Id);
  assertExists(data, person2Id);
  if (person1Id === person2Id) {
    const err = new Error('A person cannot be their own spouse');
    err.status = 400;
    throw err;
  }
  const p1 = data.people[person1Id];
  const p2 = data.people[person2Id];
  if (!p1.spouseIds.includes(person2Id)) p1.spouseIds.push(person2Id);
  if (!p2.spouseIds.includes(person1Id)) p2.spouseIds.push(person1Id);
  save(data);
  return { p1, p2 };
}

export function removeSpouses(person1Id, person2Id) {
  const data = load();
  assertExists(data, person1Id);
  assertExists(data, person2Id);
  data.people[person1Id].spouseIds = data.people[person1Id].spouseIds.filter((id) => id !== person2Id);
  data.people[person2Id].spouseIds = data.people[person2Id].spouseIds.filter((id) => id !== person1Id);
  save(data);
}

export function loadRaw() {
  return load();
}

export function replaceAll(data) {
  save(data);
}
