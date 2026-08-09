const STORAGE_KEY = 'roots.family-tree.v1';
const SEED_URL = `${import.meta.env.BASE_URL}data/family-tree.json`;
const NOTIFY_EMAIL = 'mukilr@gmail.com';
const MAX_INLINE_JSON_LENGTH = 1500;

function readAll() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeAll(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Fetched once per page load (not persisted) — reloading the page always
// re-fetches whatever is currently published, so "pending" stays honest
// across deploys instead of relying on a flag someone could clear by
// clicking Save without actually sending the email.
let seedDataPromise = null;

function loadSeedData() {
  if (!seedDataPromise) {
    seedDataPromise = fetch(SEED_URL)
      .then((res) => (res.ok ? res.json() : { nextId: 1, people: {} }))
      .catch(() => ({ nextId: 1, people: {} }));
  }
  return seedDataPromise;
}

export function ensureSeeded() {
  if (readAll()) return Promise.resolve();
  return loadSeedData().then((seed) => {
    if (!readAll()) writeAll(seed);
  });
}

const COMPARABLE_FIELDS = [
  'firstName',
  'lastName',
  'gender',
  'birthDate',
  'deathDate',
  'photoUrl',
  'notes',
  'parentIds',
  'childrenIds',
  'spouseIds',
];

function sameValue(a, b) {
  if (Array.isArray(a) || Array.isArray(b)) {
    const sa = [...(a || [])].sort();
    const sb = [...(b || [])].sort();
    return sa.length === sb.length && sa.every((v, i) => v === sb[i]);
  }
  return a === b;
}

// A person is "pending" if they don't exist in the published source yet,
// or exist there but with different data — computed fresh, never stored.
function isPending(person, sourcePerson) {
  if (!sourcePerson) return true;
  return COMPARABLE_FIELDS.some((field) => !sameValue(person[field], sourcePerson[field]));
}

// Opens a pre-filled email draft in the visitor's own mail client — there's
// no backend on a static site to send this silently, so the visitor has to
// hit send themselves. Large trees won't fit in a mailto body, so we fall
// back to copying the JSON to the clipboard instead. Whether they actually
// hit send is outside the page's visibility, so this never marks anything
// as "saved" — that only happens once the published source itself changes.
function notifyChange(data) {
  try {
    const json = JSON.stringify(data, null, 2);
    const subject = encodeURIComponent('Roots family tree update');
    let body;
    if (json.length <= MAX_INLINE_JSON_LENGTH) {
      body = encodeURIComponent(`Updated family tree data:\n\n${json}`);
    } else {
      navigator.clipboard?.writeText(json).catch(() => {});
      body = encodeURIComponent(
        'The updated family tree JSON was too large for an email body, so it was copied ' +
          'to your clipboard instead — paste it into this email before sending.'
      );
    }
    const link = document.createElement('a');
    link.href = `mailto:${NOTIFY_EMAIL}?subject=${subject}&body=${body}`;
    link.click();
  } catch {
    // Best-effort only — never block anything on this.
  }
}

export async function getAllPeople() {
  const data = readAll() ?? { nextId: 1, people: {} };
  const seed = await loadSeedData();
  return Object.values(data.people).map((person) => ({
    ...person,
    pending: isPending(person, seed.people[person.id]),
  }));
}

export function saveAndNotify() {
  const data = readAll() ?? { nextId: 1, people: {} };
  notifyChange(data);
}

export function createPerson(fields) {
  const data = readAll();
  const id = String(data.nextId++);
  const person = {
    id,
    firstName: fields.firstName,
    lastName: fields.lastName || '',
    gender: fields.gender || null,
    birthDate: fields.birthDate || null,
    deathDate: fields.deathDate || null,
    photoUrl: fields.photoUrl || null,
    notes: fields.notes || null,
    parentIds: [],
    childrenIds: [],
    spouseIds: [],
  };
  data.people[id] = person;
  writeAll(data);
  return person;
}

export function updatePerson(id, fields) {
  const data = readAll();
  const existing = data.people[id];
  if (!existing) {
    throw Object.assign(new Error('Person not found'), { status: 404 });
  }
  const updated = {
    ...existing,
    ...fields,
    id: existing.id,
    parentIds: existing.parentIds,
    childrenIds: existing.childrenIds,
    spouseIds: existing.spouseIds,
  };
  data.people[id] = updated;
  writeAll(data);
  return updated;
}

export function deletePerson(id) {
  const data = readAll();
  if (!data.people[id]) {
    throw Object.assign(new Error('Person not found'), { status: 404 });
  }
  for (const person of Object.values(data.people)) {
    person.parentIds = person.parentIds.filter((pid) => pid !== id);
    person.childrenIds = person.childrenIds.filter((cid) => cid !== id);
    person.spouseIds = person.spouseIds.filter((sid) => sid !== id);
  }
  delete data.people[id];
  writeAll(data);
}

function assertExists(data, id) {
  if (!data.people[id]) {
    throw Object.assign(new Error(`Person ${id} not found`), { status: 404 });
  }
}

export function addParentChild(parentId, childId) {
  const data = readAll();
  assertExists(data, parentId);
  assertExists(data, childId);
  if (parentId === childId) {
    throw Object.assign(new Error('A person cannot be their own parent'), { status: 400 });
  }
  const parent = data.people[parentId];
  const child = data.people[childId];
  if (!child.parentIds.includes(parentId)) child.parentIds.push(parentId);
  if (!parent.childrenIds.includes(childId)) parent.childrenIds.push(childId);
  writeAll(data);
}

export function removeParentChild(parentId, childId) {
  const data = readAll();
  assertExists(data, parentId);
  assertExists(data, childId);
  data.people[parentId].childrenIds = data.people[parentId].childrenIds.filter((id) => id !== childId);
  data.people[childId].parentIds = data.people[childId].parentIds.filter((id) => id !== parentId);
  writeAll(data);
}

export function addSpouses(person1Id, person2Id) {
  const data = readAll();
  assertExists(data, person1Id);
  assertExists(data, person2Id);
  if (person1Id === person2Id) {
    throw Object.assign(new Error('A person cannot be their own spouse'), { status: 400 });
  }
  const p1 = data.people[person1Id];
  const p2 = data.people[person2Id];
  if (!p1.spouseIds.includes(person2Id)) p1.spouseIds.push(person2Id);
  if (!p2.spouseIds.includes(person1Id)) p2.spouseIds.push(person1Id);
  writeAll(data);
}

export function removeSpouses(person1Id, person2Id) {
  const data = readAll();
  assertExists(data, person1Id);
  assertExists(data, person2Id);
  data.people[person1Id].spouseIds = data.people[person1Id].spouseIds.filter((id) => id !== person2Id);
  data.people[person2Id].spouseIds = data.people[person2Id].spouseIds.filter((id) => id !== person1Id);
  writeAll(data);
}

export function exportRaw() {
  return readAll() ?? { nextId: 1, people: {} };
}
