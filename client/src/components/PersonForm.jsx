import { useState } from 'react';

const EMPTY = { firstName: '', lastName: '', gender: '', birthDate: '', deathDate: '', notes: '' };

const label = (p) => `${p.firstName} ${p.lastName}`.trim() || `#${p.id}`;

export function PersonForm({ people = [], onCreate, onLink, onSuccess, showHeading = true }) {
  const [form, setForm] = useState(EMPTY);
  const [relType, setRelType] = useState('');
  const [relPersonId, setRelPersonId] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const unset = (field) => () => setForm((f) => ({ ...f, [field]: '' }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.firstName.trim()) {
      setError('First name is required');
      return;
    }
    if (relType && !relPersonId) {
      setError('Choose who they are related to');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const person = await onCreate({
        ...form,
        gender: form.gender || null,
        birthDate: form.birthDate || null,
        deathDate: form.deathDate || null,
        notes: form.notes || null,
      });
      if (relType && relPersonId) {
        if (relType === 'child') await onLink('parent-child', relPersonId, person.id);
        else if (relType === 'parent') await onLink('parent-child', person.id, relPersonId);
        else if (relType === 'spouse') await onLink('spouse', person.id, relPersonId);
      }
      setForm(EMPTY);
      setRelType('');
      setRelPersonId('');
      onSuccess?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="ft-form" onSubmit={submit}>
      {showHeading && <h3>Add person</h3>}
      <div className="ft-form-row">
        <input placeholder="First name" value={form.firstName} onChange={update('firstName')} required />
        <input placeholder="Last name (optional)" value={form.lastName} onChange={update('lastName')} />
      </div>
      <select value={form.gender} onChange={update('gender')}>
        <option value="">Gender (optional)</option>
        <option value="male">Male</option>
        <option value="female">Female</option>
      </select>
      <div className="ft-form-row">
        <div className="ft-date-field">
          <input type="date" value={form.birthDate} onChange={update('birthDate')} title="Birth date" />
          {form.birthDate && (
            <button type="button" className="ft-unset-btn" onClick={unset('birthDate')} title="Clear birth date">
              ✕
            </button>
          )}
        </div>
        <div className="ft-date-field">
          <input type="date" value={form.deathDate} onChange={update('deathDate')} title="Death date" />
          {form.deathDate && (
            <button type="button" className="ft-unset-btn" onClick={unset('deathDate')} title="Clear death date">
              ✕
            </button>
          )}
        </div>
      </div>
      <textarea placeholder="Notes (optional)" value={form.notes} onChange={update('notes')} rows={2} />

      {people.length > 0 && (
        <div className="ft-form-row">
          <select
            value={relType}
            onChange={(e) => {
              setRelType(e.target.value);
              if (!e.target.value) setRelPersonId('');
            }}
          >
            <option value="">No relationship</option>
            <option value="child">Child of…</option>
            <option value="parent">Parent of…</option>
            <option value="spouse">Spouse of…</option>
          </select>
          <select value={relPersonId} onChange={(e) => setRelPersonId(e.target.value)} disabled={!relType}>
            <option value="">Choose person…</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {label(p)}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && <div className="ft-error">{error}</div>}
      <button type="submit" disabled={submitting}>
        {submitting ? 'Adding…' : 'Add person'}
      </button>
    </form>
  );
}
