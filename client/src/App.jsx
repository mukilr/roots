import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';
import { ForceTreeGraph } from './components/ForceTreeGraph.jsx';
import { PersonForm } from './components/PersonForm.jsx';
import { Modal } from './components/Modal.jsx';
import { PersonDetailModal } from './components/PersonDetailModal.jsx';

// A focused family is one ancestor plus every direct descendant, recursively
// — spouses are included (so couples still render together) but a spouse's
// own side of the family is never expanded past them.
function computeFocusedFamily(rootId, peopleById) {
  const visible = new Set();
  const queue = [rootId];
  while (queue.length) {
    const id = queue.shift();
    if (visible.has(id) || !peopleById[id]) continue;
    visible.add(id);
    const person = peopleById[id];
    for (const childId of person.childrenIds) {
      if (!visible.has(childId)) queue.push(childId);
    }
    for (const spouseId of person.spouseIds) {
      visible.add(spouseId);
    }
  }
  return visible;
}

function computeUnionFocusedSet(rootIds, peopleById) {
  const set = new Set();
  for (const rootId of rootIds) {
    for (const id of computeFocusedFamily(rootId, peopleById)) set.add(id);
  }
  return set;
}

// Walks up the blood line (via the first recorded parent) to find the
// ancestor at the top of this person's family — used to pull in "the other
// family" when a spouse link crosses into it.
function findFamilyRoot(personId, peopleById) {
  let current = peopleById[personId];
  const seen = new Set();
  while (current && current.parentIds.length > 0 && !seen.has(current.id)) {
    seen.add(current.id);
    const parent = peopleById[current.parentIds[0]];
    if (!parent) break;
    current = parent;
  }
  return current ? current.id : personId;
}

export default function App() {
  const [people, setPeople] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detailPersonId, setDetailPersonId] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [focusedRootIds, setFocusedRootIds] = useState([]);

  const peopleById = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p])), [people]);
  const detailPerson = detailPersonId ? peopleById[detailPersonId] : null;
  const hasPending = people.some((p) => p.pending);

  const focusedSet = useMemo(
    () => (focusedRootIds.length > 0 ? computeUnionFocusedSet(focusedRootIds, peopleById) : null),
    [focusedRootIds, peopleById]
  );
  const focusedRoots = focusedRootIds.map((id) => peopleById[id]).filter(Boolean);
  const visiblePeople = focusedSet ? people.filter((p) => focusedSet.has(p.id)) : people;

  const refresh = useCallback(async () => {
    try {
      const peopleData = await api.getPeople();
      setPeople(peopleData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleCreate = async (data) => {
    const person = await api.createPerson(data);
    await refresh();
    setSelectedId(person.id);
    return person;
  };

  const handleLink = async (type, person1Id, person2Id) => {
    // Spouses aren't descendants, so linking one in doesn't naturally belong
    // to the currently focused family/families. If the other person is
    // already established elsewhere (has other relationships) and isn't
    // part of what's focused, pull their whole family in too, so both sides
    // display together, joined by this new link. A brand-new, blank person
    // becoming a satellite doesn't need this (nothing "outside" about them
    // yet). Checked against a fresh snapshot rather than possibly-stale
    // state, since this can run right after a create-and-link in one go.
    if (type === 'spouse' && focusedRootIds.length > 0) {
      const freshPeople = await api.getPeople();
      const freshById = Object.fromEntries(freshPeople.map((p) => [p.id, p]));
      const freshFocusedSet = computeUnionFocusedSet(focusedRootIds, freshById);
      const otherId = freshFocusedSet.has(person1Id) ? person2Id : person1Id;
      const other = freshById[otherId];
      const hadPriorConnections =
        other && (other.parentIds.length > 0 || other.childrenIds.length > 0 || other.spouseIds.length > 0);
      if (!freshFocusedSet.has(otherId) && hadPriorConnections) {
        const otherRootId = findFamilyRoot(otherId, freshById);
        setFocusedRootIds((prev) => (prev.includes(otherRootId) ? prev : [...prev, otherRootId]));
      }
    }
    await api.addRelationship(type, person1Id, person2Id);
    await refresh();
  };

  const handleUnlink = async (type, person1Id, person2Id) => {
    await api.removeRelationship(type, person1Id, person2Id);
    await refresh();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this person? This removes them from all relationships.')) return;
    await api.deletePerson(id);
    if (selectedId === id) setSelectedId(null);
    if (detailPersonId === id) setDetailPersonId(null);
    if (focusedRootIds.includes(id)) setFocusedRootIds((prev) => prev.filter((rid) => rid !== id));
    await refresh();
  };

  const handleExport = async () => {
    const data = await api.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'family-tree.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Clicking a star opens that person's detail — relationships are managed
  // from there, via PersonDetailModal.
  const handleSelect = (id) => {
    setSelectedId(id);
    setDetailPersonId(id);
  };

  const handleSave = async () => {
    await api.save();
    await refresh();
  };

  const handleFocusFamily = (id) => {
    setFocusedRootIds([id]);
    setDetailPersonId(null);
  };

  return (
    <div className="ft-app">
      {/* Fixed-position UI lives outside .ft-canvas's overflow:hidden box —
          nesting position:fixed elements inside overflow:hidden ancestors is
          a known iOS Safari bug where they get clipped/lost instead of
          staying pinned to the real viewport. */}
      <h1 className="ft-title">Roots</h1>

      <div className="ft-canvas-actions">
        <button
          className="ft-save-fab"
          onClick={handleSave}
          disabled={!hasPending}
          title={hasPending ? 'Save — email the update to mukilr' : 'No unsaved changes'}
          aria-label="Save and email update"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 4h13l3 3v13H4z" />
            <path d="M8 4v6h8V4" />
            <path d="M8 20v-6h8v6" />
          </svg>
        </button>
        <button className="ft-add-fab" onClick={() => setShowAddPerson(true)} title="Add person" aria-label="Add person">
          +
        </button>
        <button className="ft-download-fab" onClick={handleExport} title="Download JSON" aria-label="Download JSON">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3v12" />
            <path d="M7 10l5 5 5-5" />
            <path d="M4 21h16" />
          </svg>
        </button>
      </div>

      {focusedRoots.length > 0 && (
        <div className="ft-focus-banner">
          Focused on {focusedRoots.map((r) => `${r.firstName}'s family`).join(' + ')}
          <button type="button" onClick={() => setFocusedRootIds([])}>
            Show all
          </button>
        </div>
      )}

      {error && <div className="ft-error-banner">{error}</div>}

      <main className="ft-canvas">
        {loading ? (
          <div className="ft-loading">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2 L14.4 9.2 L22 9.5 L15.9 14.3 L18.1 22 L12 17.3 L5.9 22 L8.1 14.3 L2 9.5 L9.6 9.2 Z" />
            </svg>
          </div>
        ) : (
          <ForceTreeGraph people={visiblePeople} selectedId={selectedId} onSelect={handleSelect} />
        )}
      </main>

      {showAddPerson && (
        <Modal title="Add person" onClose={() => setShowAddPerson(false)}>
          <PersonForm
            people={people}
            onCreate={handleCreate}
            onLink={handleLink}
            onSuccess={() => setShowAddPerson(false)}
            showHeading={false}
          />
        </Modal>
      )}

      {detailPerson && (
        <PersonDetailModal
          person={detailPerson}
          peopleById={peopleById}
          otherPeople={people.filter((p) => p.id !== detailPerson.id)}
          onClose={() => setDetailPersonId(null)}
          onLink={handleLink}
          onUnlink={handleUnlink}
          onDelete={handleDelete}
          onFocusFamily={handleFocusFamily}
          isFocused={focusedRootIds.includes(detailPerson.id)}
        />
      )}
    </div>
  );
}
