import api from '../api/axios';

// Tasks that the user deleted but whose DELETE request hasn't been sent yet
// (they're waiting out the "Undo" window). Pages filter these out of fetched
// data so a refetch doesn't make a "deleted" task reappear.
const pending = new Map(); // id -> { timer, committing, onCommitted, onFailed }

export const isPendingDelete = (id) => pending.has(id);
export const withoutPendingDeletes = (tasks) => tasks.filter(t => !pending.has(t.id));

async function commit(id) {
  const entry = pending.get(id);
  if (!entry) return;
  entry.committing = true;
  try {
    await api.delete(`/tasks/${id}`);
    pending.delete(id);
    entry.onCommitted?.();
  } catch {
    pending.delete(id); // task still exists on the server, so let it reappear
    entry.onFailed?.();
  }
}

export function scheduleDelete(id, delayMs, { onCommitted, onFailed } = {}) {
  if (pending.has(id)) return;
  const entry = { timer: null, committing: false, onCommitted, onFailed };
  entry.timer = setTimeout(() => commit(id), delayMs);
  pending.set(id, entry);
}

// Returns true if the delete was cancelled, false if it was too late.
export function cancelDelete(id) {
  const entry = pending.get(id);
  if (!entry || entry.committing) return false;
  clearTimeout(entry.timer);
  pending.delete(id);
  return true;
}

// If the tab closes during the undo window, send the deletes right away.
// fetch + keepalive lets the request finish even while the page is unloading.
export function flushPendingDeletes() {
  pending.forEach((entry, id) => {
    if (entry.committing) return;
    clearTimeout(entry.timer);
    entry.committing = true;
    fetch(`/api/tasks/${id}`, { method: 'DELETE', credentials: 'include', keepalive: true }).catch(() => {});
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushPendingDeletes);
}
