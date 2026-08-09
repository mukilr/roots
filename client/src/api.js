const BASE = '/api';

async function request(path, options) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  getPeople: () => request('/people'),
  createPerson: (data) => request('/people', { method: 'POST', body: JSON.stringify(data) }),
  updatePerson: (id, data) => request(`/people/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePerson: (id) => request(`/people/${id}`, { method: 'DELETE' }),

  addRelationship: (type, person1Id, person2Id) =>
    request('/relationships', { method: 'POST', body: JSON.stringify({ type, person1Id, person2Id }) }),
  removeRelationship: (type, person1Id, person2Id) =>
    request('/relationships', { method: 'DELETE', body: JSON.stringify({ type, person1Id, person2Id }) }),

  getTree: () => request('/tree'),

  exportData: () => request('/data/export'),
};
