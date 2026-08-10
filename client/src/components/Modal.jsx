import { useEffect } from 'react';

export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      // Submitting a form dismisses the on-screen keyboard at the same
      // moment this modal unmounts. iOS Safari can leave position:fixed
      // siblings (the title/action buttons) mispositioned relative to the
      // visual viewport when that happens together — force a clean state.
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      window.scrollTo(0, 0);
    };
  }, [onClose]);

  return (
    <div className="ft-modal-backdrop" onClick={onClose}>
      <div className="ft-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ft-modal-header">
          <h2>{title}</h2>
          <button className="ft-modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
