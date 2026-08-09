import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';
import { ForceTreeGraph } from './components/ForceTreeGraph.jsx';
import { PersonForm } from './components/PersonForm.jsx';
import { Modal } from './components/Modal.jsx';
import { PersonDetailModal } from './components/PersonDetailModal.jsx';

export default function App() {
  const [people, setPeople] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detailPersonId, setDetailPersonId] = useState(null);
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

  // Clicking a star opens that person's detail — relationships are managed
  // from there, via PersonDetailModal.
  const handleSelect = (id) => {
    setSelectedId(id);
    setDetailPersonId(id);
  };

  return (
    <div className="ft-app">
      <main className="ft-canvas">
        <h1 className="ft-title">Roots</h1>

        <div className="ft-canvas-actions">
          <button className="ft-add-fab" onClick={() => setShowAddPerson(true)} title="Add person" aria-label="Add person">
            +
          </button>
          <button className="ft-download-fab" onClick={handleExport} title="Download JSON" aria-label="Download JSON">
            ⬇
          </button>
        </div>

        {error && <div className="ft-error-banner">{error}</div>}

        {loading ? (
          <div className="ft-empty">Loading…</div>
        ) : (
          <ForceTreeGraph people={people} selectedId={selectedId} onSelect={handleSelect} />
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
