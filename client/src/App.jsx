import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';
import { ForceTreeGraph } from './components/ForceTreeGraph.jsx';
import { PersonForm } from './components/PersonForm.jsx';
import { RelationshipForm } from './components/RelationshipForm.jsx';
import { PersonList } from './components/PersonList.jsx';

export default function App() {
  const [people, setPeople] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [focusId, setFocusId] = useState(null);
  const [focusNonce, setFocusNonce] = useState(0);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const peopleById = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p])), [people]);
  const selectedPerson = selectedId ? peopleById[selectedId] : null;

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

  const handleDelete = async (id) => {
    if (!confirm('Delete this person? This removes them from all relationships.')) return;
    await api.deletePerson(id);
    if (selectedId === id) setSelectedId(null);
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
        <PersonForm onCreate={handleCreate} />
        <RelationshipForm people={people} onLink={handleLink} />
        <PersonList
          people={people}
          selectedId={selectedId}
          onFocus={handleFocus}
          onSelect={setSelectedId}
          onDelete={handleDelete}
        />
        {selectedPerson && (
          <div className="ft-details">
            <h3>
              {selectedPerson.firstName} {selectedPerson.lastName}
            </h3>
            <p>Gender: {selectedPerson.gender}</p>
            {selectedPerson.birthDate && <p>Born: {selectedPerson.birthDate}</p>}
            {selectedPerson.deathDate && <p>Died: {selectedPerson.deathDate}</p>}
            {selectedPerson.notes && <p>{selectedPerson.notes}</p>}
            {selectedPerson.pending && (
              <p className="ft-pending-note">⏳ Not yet emailed — saved in this browser only.</p>
            )}
          </div>
        )}
        {error && <div className="ft-error">{error}</div>}
      </aside>

      <main className="ft-canvas">
        {loading ? (
          <div className="ft-empty">Loading…</div>
        ) : (
          <ForceTreeGraph
            people={people}
            selectedId={selectedId}
            onSelect={setSelectedId}
            focusId={focusId}
            focusNonce={focusNonce}
          />
        )}
      </main>
    </div>
  );
}
