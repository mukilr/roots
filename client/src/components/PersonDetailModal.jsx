import { useState } from 'react';
import { Modal } from './Modal.jsx';

const label = (p) => (p ? `${p.firstName} ${p.lastName}`.trim() || `#${p.id}` : 'Unknown');

export function PersonDetailModal({
  person,
  peopleById,
  otherPeople,
  onClose,
  onLink,
  onUnlink,
  onDelete,
  onFocusFamily,
  isFocused,
}) {
  const [relType, setRelType] = useState('parent');
  const [otherId, setOtherId] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const relGroups = [
    { title: 'Parents', ids: person.parentIds, unlink: (id) => onUnlink('parent-child', id, person.id) },
    { title: 'Children', ids: person.childrenIds, unlink: (id) => onUnlink('parent-child', person.id, id) },
    { title: 'Spouses', ids: person.spouseIds, unlink: (id) => onUnlink('spouse', person.id, id) },
  ];

  const submitLink = async (e) => {
    e.preventDefault();
    if (!otherId) {
      setError('Choose a person');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (relType === 'parent') await onLink('parent-child', otherId, person.id);
      else if (relType === 'child') await onLink('parent-child', person.id, otherId);
      else await onLink('spouse', person.id, otherId);
      setOtherId('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={label(person)} onClose={onClose}>
      <div className="ft-details">
        <p>Gender: {person.gender || 'Unspecified'}</p>
        {person.birthDate && <p>Born: {person.birthDate}</p>}
        {person.deathDate && <p>Died: {person.deathDate}</p>}
        {person.notes && <p>{person.notes}</p>}
        {person.pending && (
          <p className="ft-pending-note">
            <span className="ft-pending-dot-inline" />
            Not yet emailed — saved in this browser only.
          </p>
        )}

        <button
          type="button"
          className="ft-focus-btn"
          onClick={() => onFocusFamily(person.id)}
          disabled={isFocused}
        >
          {isFocused ? 'Currently focused on this family' : 'Focus this family'}
        </button>

        {relGroups.map(({ title, ids, unlink }) => (
          <div key={title} className="ft-rel-group">
            <h4>{title}</h4>
            {ids.length === 0 ? (
              <p className="ft-rel-empty">None</p>
            ) : (
              <ul>
                {ids.map((id) => (
                  <li key={id}>
                    {label(peopleById[id])}
                    <button type="button" title="Remove" onClick={() => unlink(id)}>
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}

        <form className="ft-form" onSubmit={submitLink}>
          <h3>Add relationship</h3>
          <div className="ft-form-row">
            <select value={relType} onChange={(e) => setRelType(e.target.value)}>
              <option value="parent">Parent</option>
              <option value="child">Child</option>
              <option value="spouse">Spouse</option>
            </select>
            <select value={otherId} onChange={(e) => setOtherId(e.target.value)}>
              <option value="">Choose person…</option>
              {otherPeople.map((p) => (
                <option key={p.id} value={p.id}>
                  {label(p)}
                </option>
              ))}
            </select>
          </div>
          {error && <div className="ft-error">{error}</div>}
          <button type="submit" disabled={submitting || otherPeople.length === 0}>
            {submitting ? 'Linking…' : 'Link'}
          </button>
        </form>

        <button type="button" className="ft-danger" onClick={() => onDelete(person.id)}>
          Delete person
        </button>
      </div>
    </Modal>
  );
}
