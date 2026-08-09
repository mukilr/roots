import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';
import { ForceTreeGraph } from './components/ForceTreeGraph.jsx';
import { PersonForm } from './components/PersonForm.jsx';
import { PersonList } from './components/PersonList.jsx';
import { Modal } from './components/Modal.jsx';
import { PersonDetailModal } from './components/PersonDetailModal.jsx';

export default function App() {
  const [people, setPeople] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detailPersonId, setDetailPersonId] = useState(null);
  const [focusId, setFocusId] = useState(null);
  const [focusNonce, setFocusNonce] = useState(0);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddPerson, setShowAddPerson] = useState(false);

  const peopleById = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p])), [people]);
  const detailPerson = detailPersonId ? peopleById[detailPersonId] : null;

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
  };

  const handleLink = async (type, person1Id, person2Id) => {
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

  // Clicking a star (or a name in the sidebar) opens that person's detail —
  // relationships are managed from there now, not a separate sidebar form.
  const handleSelect = (id) => {
    setSelectedId(id);
    setDetailPersonId(id);
  };

  const handleFocus = (id) => {
    setSelectedId(id);
    setFocusId(id);
    setFocusNonce((n) => n + 1);
  };

  return (
    <div className="ft-app">
      <header className="ft-header">
        <h1>Roots</h1>
        <button onClick={handleExport}>Export JSON</button>
      </header>

      <aside className="ft-sidebar">
        <PersonList
          people={people}
          selectedId={selectedId}
          onFocus={handleFocus}
          onSelect={handleSelect}
          onDelete={handleDelete}
        />
        {error && <div className="ft-error">{error}</div>}
      </aside>

      <main className="ft-canvas">
        <button className="ft-add-fab" onClick={() => setShowAddPerson(true)} title="Add person" aria-label="Add person">
          +
        </button>
        {loading ? (
          <div className="ft-empty">Loading…</div>
        ) : (
          <ForceTreeGraph
            people={people}
            selectedId={selectedId}
            onSelect={handleSelect}
            focusId={focusId}
            focusNonce={focusNonce}
          />
        )}
      </main>

      {showAddPerson && (
        <Modal title="Add person" onClose={() => setShowAddPerson(false)}>
          <PersonForm onCreate={handleCreate} onSuccess={() => setShowAddPerson(false)} showHeading={false} />
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
        />
      )}
    </div>
  );
}
