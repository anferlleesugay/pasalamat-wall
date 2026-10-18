import { useCallback, useEffect, useState } from 'react';
import { notesApi } from './api';

const CATEGORIES = [
  { value: 'classmate', label: 'Classmate' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'staff', label: 'Staff (guard, canteen, janitor…)' },
  { value: 'other', label: 'Someone else' },
];

const EMPTY_FORM = { toName: '', fromName: '', message: '', category: 'classmate' };

export default function Wall({ site }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [sending, setSending] = useState(false);
  const [formMessage, setFormMessage] = useState(null);

  const loadNotes = useCallback(async () => {
    try {
      setNotes(await notesApi.list());
      setLoadError('');
    } catch {
      setLoadError('Could not load the wall right now. Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotes();
    const timer = setInterval(loadNotes, 10000); // newly approved notes appear on their own
    return () => clearInterval(timer);
  }, [loadNotes]);

  function update(field) {
    return (event) => setForm({ ...form, [field]: event.target.value });
  }

  async function submit(event) {
    event.preventDefault();
    setSending(true);
    setFormMessage(null);
    try {
      await notesApi.create(form);
      setForm(EMPTY_FORM);
      setFormMessage({ type: 'ok', text: 'Salamat! Your note will appear once it passes a quick kindness check.' });
    } catch (error) {
      setFormMessage({ type: 'error', text: error.message });
    } finally {
      setSending(false);
    }
  }

  async function heart(id) {
    setNotes((current) => current.map((n) => (n.id === id ? { ...n, hearts: n.hearts + 1 } : n)));
    try {
      const result = await notesApi.heart(id);
      setNotes((current) => current.map((n) => (n.id === id ? { ...n, hearts: result.hearts } : n)));
    } catch {
      loadNotes();
    }
  }

  return (
    <>
      {site.announcement && <div className="announcement">{site.announcement}</div>}

      <section className="hero">
        <h1>{site.headline}</h1>
        <p>{site.tagline}</p>
      </section>

      <section className="layout">
        <form className="card compose" onSubmit={submit}>
          <h2>Write a thank-you</h2>
          <label>
            To
            <input value={form.toName} onChange={update('toName')} maxLength={60} placeholder="Kuya Guard, Ma'am Santos…" required />
          </label>
          <label>
            They are a…
            <select value={form.category} onChange={update('category')}>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>
          <label>
            Message
            <textarea value={form.message} onChange={update('message')} minLength={3} maxLength={280} rows={4} placeholder="Salamat for…" required />
            <span className="counter">{form.message.length}/280</span>
          </label>
          <label>
            <span>From <span className="hint">(optional)</span></span>
            <input value={form.fromName} onChange={update('fromName')} maxLength={60} placeholder="Anonymous" />
          </label>
          <button type="submit" disabled={sending}>{sending ? 'Sending…' : 'Post note'}</button>
          {formMessage && <p className={`notice ${formMessage.type}`}>{formMessage.text}</p>}
        </form>

        <div className="notes">
          {loading && <p className="muted">Loading notes…</p>}
          {loadError && <p className="notice error">{loadError}</p>}
          {!loading && !loadError && notes.length === 0 && <p className="muted">No notes yet. Be the first to say salamat!</p>}
          {notes.map((note) => (
            <article key={note.id} className={`note note-${note.category}`}>
              <p className="note-to">To <strong>{note.toName}</strong></p>
              <p className="note-message">{note.message}</p>
              <div className="note-footer">
                <span className="note-from">— {note.fromName}</span>
                <button type="button" className="heart" onClick={() => heart(note.id)} aria-label={`Send a heart to ${note.toName}`}>
                  ♥ {note.hearts}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
