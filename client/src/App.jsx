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
  const hasPending = people.some((p) => p.pending);

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

  const handleSave = async () => {
    await api.save();
    await refresh();
  };

  return (
    <div className="ft-app">
      <main className="ft-canvas">
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

        {error && <div className="ft-error-banner">{error}</div>}

        {loading ? (
          <div className="ft-loading">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2 L14.4 9.2 L22 9.5 L15.9 14.3 L18.1 22 L12 17.3 L5.9 22 L8.1 14.3 L2 9.5 L9.6 9.2 Z" />
            </svg>
          </div>
        ) : (
          <ForceTreeGraph people={people} selectedId={selectedId} onSelect={handleSelect} />
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
        />
      )}
    </div>
  );
}
