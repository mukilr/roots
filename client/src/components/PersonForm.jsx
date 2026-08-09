import { useState } from 'react';

const EMPTY = { firstName: '', lastName: '', gender: 'male', birthDate: '', deathDate: '', notes: '' };

export function PersonForm({ onCreate, onSuccess, showHeading = true }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.firstName.trim()) {
      setError('First name is required');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onCreate({
        ...form,
        birthDate: form.birthDate || null,
        deathDate: form.deathDate || null,
        notes: form.notes || null,
      });
      setForm(EMPTY);
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
        <input placeholder="Last name" value={form.lastName} onChange={update('lastName')} />
      </div>
      <div className="ft-form-row">
        <select value={form.gender} onChange={update('gender')}>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
        <input type="date" value={form.birthDate} onChange={update('birthDate')} title="Birth date" />
        <input type="date" value={form.deathDate} onChange={update('deathDate')} title="Death date" />
      </div>
      <textarea placeholder="Notes (optional)" value={form.notes} onChange={update('notes')} rows={2} />
      {error && <div className="ft-error">{error}</div>}
      <button type="submit" disabled={submitting}>
        {submitting ? 'Adding…' : 'Add person'}
      </button>
    </form>
  );
}
