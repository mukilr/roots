export function PersonList({ people, selectedId, onFocus, onSelect, onDelete }) {
  const label = (p) => `${p.firstName} ${p.lastName}`.trim() || `#${p.id}`;

  return (
    <div className="ft-list">
      <h3>People ({people.length})</h3>
      <ul>
        {people.map((p) => (
          <li key={p.id} className={p.id === selectedId ? 'is-selected' : ''}>
            <button className="ft-list-name" onClick={() => onSelect(p.id)}>
              {label(p)}
            </button>
            <div className="ft-list-actions">
              <button title="Center the tree on this person" onClick={() => onFocus(p.id)}>
                Focus
              </button>
              <button title="Delete" onClick={() => onDelete(p.id)}>
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
