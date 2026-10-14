import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const ANIM_MS = 180;

export default function ConfirmModal({
  title = 'Are you sure?',
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  danger = true,
  onConfirm,
  onCancel,
}) {
  const [visible, setVisible] = useState(false);
  const cancelRef = useRef(null);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    cancelRef.current?.focus(); // safest default: Enter will NOT delete
  }, []);

  const close = (cb) => {
    setVisible(false);
    setTimeout(cb, ANIM_MS);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') close(onCancel);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onCancel]);

  return createPortal(
    <div
      className={`modal-overlay ${visible ? 'visible' : ''}`}
      onMouseDown={(e) => { if (e.target === e.currentTarget) close(onCancel); }}
    >
      <div
        className={`modal confirm-modal ${visible ? 'visible' : ''}`}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-header">
          <h2>{title}</h2>
        </div>
        <p className="confirm-text">{message}</p>
        <div className="modal-actions">
          <button ref={cancelRef} type="button" className="btn-secondary" onClick={() => close(onCancel)}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={danger ? 'btn-danger' : 'btn-primary'}
            onClick={() => close(onConfirm)}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
