import { useState, useEffect } from 'react';
import api from '../../api/axios';
import VoiceInputButton from '../common/VoiceInputButton';
import { appendSpoken } from '../../utils/speech';
import useSmartTitle from '../../hooks/useSmartTitle';
import SmartChip from './SmartChip';

export default function EditTaskModal({ task, onClose, onUpdated }) {
  const [form, setForm] = useState({
    title: task.title || '',
    description: task.description || '',
    task_date: task.task_date ? task.task_date.split('T')[0] : '',
    task_time: task.task_time ? task.task_time.substring(0, 5) : '',
  });
  // Reads a date/time typed into the title and fills the fields. Nothing is read until the
  // title is changed, so opening a task never rewrites its saved date.
  const smart = useSmartTitle(form, setForm, {
    baseDate: task.task_date ? task.task_date.split('T')[0] : '',
    baseTime: task.task_time ? task.task_time.substring(0, 5) : '',
    initialTitle: task.title || '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const close = () => {
    setVisible(false);
    setTimeout(onClose, 180);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Task title is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await api.put(`/tasks/${task.id}`, { ...form, title: smart.finalTitle });
      onUpdated(res.data.task);
      close();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update task.');
      setSaving(false);
    }
  };

  return (
    <div className={`modal-overlay ${visible ? 'visible' : ''}`} onClick={close}>
      <div
        className={`modal ${visible ? 'visible' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Edit Task</h2>
          <button className="modal-close" onClick={close}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Title <span className="required">*</span></label>
            <div className="voice-field">
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                autoFocus
              />
              <VoiceInputButton
                onText={t => setForm(f => ({ ...f, title: appendSpoken(f.title, t, { maxLength: 255 }) }))}
              />
            </div>
            <SmartChip chip={smart.chip} />
          </div>

          <div className="form-group">
            <label>Description</label>
            <div className="voice-field is-textarea">
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
              />
              <VoiceInputButton
                showLanguage
                onText={t => setForm(f => ({ ...f, description: appendSpoken(f.description, t) }))}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={form.task_date}
                onChange={e => { smart.markDate(); setForm(f => ({ ...f, task_date: e.target.value })); }}
              />
            </div>
            <div className="form-group">
              <label>Time</label>
              <input
                type="time"
                value={form.task_time}
                onChange={e => { smart.markTime(); setForm(f => ({ ...f, task_time: e.target.value })); }}
              />
            </div>
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={close}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
