import { useState } from 'react';

export function RelationshipForm({ people, onLink }) {
  const [type, setType] = useState('parent-child');
  const [person1Id, setPerson1Id] = useState('');
  const [person2Id, setPerson2Id] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const label = (p) => `${p.firstName} ${p.lastName}`.trim() || `#${p.id}`;

  const submit = async (e) => {
    e.preventDefault();
    if (!person1Id || !person2Id) {
      setError('Choose both people');
      return;
    }
    if (person1Id === person2Id) {
      setError('Choose two different people');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onLink(type, person1Id, person2Id);
      setPerson1Id('');
      setPerson2Id('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="ft-form" onSubmit={submit}>
      <h3>Link people</h3>
      <select value={type} onChange={(e) => setType(e.target.value)}>
        <option value="parent-child">Parent → Child</option>
        <option value="spouse">Spouses</option>
      </select>
      <div className="ft-form-row">
        <select value={person1Id} onChange={(e) => setPerson1Id(e.target.value)}>
          <option value="">{type === 'parent-child' ? 'Parent…' : 'Person…'}</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {label(p)}
            </option>
          ))}
        </select>
        <select value={person2Id} onChange={(e) => setPerson2Id(e.target.value)}>
          <option value="">{type === 'parent-child' ? 'Child…' : 'Spouse…'}</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {label(p)}
            </option>
          ))}
        </select>
      </div>
      {error && <div className="ft-error">{error}</div>}
      <button type="submit" disabled={submitting || people.length < 2}>
        {submitting ? 'Linking…' : 'Link'}
      </button>
    </form>
  );
}
