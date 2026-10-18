import { useCallback, useEffect, useState } from 'react';
import { studioApi } from './api';
import { validateSite } from './siteRules';
import { BUILD_NUMBER } from './buildInfo';

const FIELDS = [
  { key: 'headline', label: 'Headline', type: 'text' },
  { key: 'tagline', label: 'Tagline', type: 'textarea' },
  { key: 'announcement', label: 'Announcement banner (leave empty to hide)', type: 'text' },
  { key: 'themeColor', label: 'Theme color', type: 'color' },
  { key: 'versionLabel', label: 'Version label', type: 'text' },
];

const TOKEN_KEY = 'studio-token';

function readToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

function saveToken(token) {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // storage unavailable (private mode): token just lives in memory
  }
}

function buildStatus(comment) {
  if (!comment) return { icon: '⏳', label: 'Waiting for Jenkins…', tone: 'pending' };
  if (comment.startsWith('✅')) return { icon: '✅', label: comment.split('\n')[0].slice(2), tone: 'ok' };
  if (comment.startsWith('❌')) return { icon: '❌', label: comment.split('\n')[0].slice(2), tone: 'fail' };
  return { icon: 'ℹ️', label: comment.split('\n')[0], tone: 'pending' };
}

function Login({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { token } = await studioApi.login(password);
      onLogin(token);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card login" onSubmit={submit}>
      <h2>Release Studio</h2>
      <p className="muted">Edit the site and ship it, no code editor needed. Every change becomes a Git commit and goes through the Jenkins pipeline.</p>
      <label>
        Password
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus required />
      </label>
      <button type="submit" disabled={busy}>{busy ? 'Checking…' : 'Enter studio'}</button>
      {error && <p className="notice error">{error}</p>}
    </form>
  );
}

export default function Studio({ deployed }) {
  const [token, setToken] = useState(readToken);
  const [draft, setDraft] = useState(null);
  const [original, setOriginal] = useState(null);
  const [bypass, setBypass] = useState(false);
  const [shipping, setShipping] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);

  const logout = useCallback(() => {
    saveToken('');
    setToken('');
  }, []);

  const handleError = useCallback((err) => {
    if (err.status === 401) logout();
    else setError(err.message);
  }, [logout]);

  const loadSite = useCallback(async () => {
    try {
      const { site } = await studioApi.getSite(token);
      setDraft(site);
      setOriginal(site);
    } catch (err) {
      handleError(err);
    }
  }, [token, handleError]);

  const loadHistory = useCallback(async () => {
    try {
      const { commits } = await studioApi.history(token);
      setHistory(commits);
    } catch (err) {
      if (err.status === 401) logout();
    }
  }, [token, logout]);

  useEffect(() => {
    if (!token) return undefined;
    loadSite();
    loadHistory();
    const timer = setInterval(loadHistory, 10000); // watch Jenkins post its result
    return () => clearInterval(timer);
  }, [token, loadSite, loadHistory]);

  if (!token) {
    return <Login onLogin={(t) => { saveToken(t); setToken(t); }} />;
  }
  if (!draft) {
    return <p className="muted center">{error || 'Loading the latest site content from GitHub…'}</p>;
  }

  const errors = validateSite(draft);
  const hasErrors = Object.keys(errors).length > 0;
  const changed = original && FIELDS.some(({ key }) => draft[key] !== original[key]);

  async function ship() {
    setShipping(true);
    setError('');
    setResult(null);
    try {
      const changes = Object.fromEntries(FIELDS.filter(({ key }) => draft[key] !== original[key]).map(({ key }) => [key, draft[key]]));
      const shipped = await studioApi.ship(token, changes, bypass);
      setResult(shipped);
      setOriginal(draft);
      setBypass(false);
      loadHistory();
    } catch (err) {
      handleError(err);
    } finally {
      setShipping(false);
    }
  }

  return (
    <div className="studio">
      <div className="studio-head">
        <div>
          <h1>Release Studio</h1>
          <p className="muted">Live site is running <strong>Build #{BUILD_NUMBER}</strong>. Shipping creates a commit; Jenkins tests, builds, and deploys it.</p>
        </div>
        <button type="button" className="ghost" onClick={logout}>Log out</button>
      </div>

      <div className="studio-grid">
        <section className="card">
          <h2>Edit content</h2>
          {FIELDS.map(({ key, label, type }) => (
            <label key={key} className={errors[key] ? 'invalid' : ''}>
              {label}
              {type === 'textarea' && (
                <textarea rows={3} value={draft[key] ?? ''} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} />
              )}
              {type === 'text' && (
                <input value={draft[key] ?? ''} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} />
              )}
              {type === 'color' && (
                <span className="color-row">
                  <input
                    type="color"
                    value={/^#[0-9a-fA-F]{6}$/.test(draft[key]) ? draft[key] : '#000000'}
                    onChange={(e) => setDraft({ ...draft, [key]: e.target.value.toUpperCase() })}
                    aria-label="Pick a color"
                  />
                  <input value={draft[key] ?? ''} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} />
                </span>
              )}
              {errors[key] && <span className="field-error">{label.split(' (')[0]} {errors[key]}</span>}
            </label>
          ))}

          <label className="bypass">
            <input type="checkbox" checked={bypass} onChange={(e) => setBypass(e.target.checked)} />
            <span>
              Skip validation <em>(quality-gate demo)</em>
              <small>Lets an invalid value through so you can watch Jenkins block it at the Test stage.</small>
            </span>
          </label>

          <button type="button" className="ship" onClick={ship} disabled={shipping || !changed || (hasErrors && !bypass)}>
            {shipping ? 'Shipping… (AI is writing the commit message)' : '🚀 Ship it'}
          </button>
          {!changed && <p className="muted small">Change something to enable shipping.</p>}
          {error && <p className="notice error">{error}</p>}
          {result && (
            <div className="notice ok shipped">
              <p><strong>Committed {result.commitSha.slice(0, 7)}</strong> · message by {result.messageSource === 'ai' ? 'Gemini ✨' : 'template'}</p>
              <code>{result.message}</code>
              <p><a href={result.commitUrl} target="_blank" rel="noreferrer">View on GitHub ↗</a> · Jenkins is picking it up now.</p>
            </div>
          )}
        </section>

        <section className="card preview" style={{ '--theme': /^#[0-9a-fA-F]{6}$/.test(draft.themeColor) ? draft.themeColor : deployed.themeColor }}>
          <h2>Preview</h2>
          {draft.announcement && <div className="announcement">{draft.announcement}</div>}
          <div className="hero small">
            <h1>{draft.headline}</h1>
            <p>{draft.tagline}</p>
          </div>
          <p className="muted small">Version {draft.versionLabel}</p>
        </section>
      </div>

      <section className="card">
        <h2>Recent releases</h2>
        {history.length === 0 && <p className="muted">No releases yet.</p>}
        <ul className="history">
          {history.map((commit) => {
            const status = buildStatus(commit.build);
            return (
              <li key={commit.sha} className={`status-${status.tone}`}>
                <span className="status-icon" aria-hidden="true">{status.icon}</span>
                <div>
                  <a href={commit.url} target="_blank" rel="noreferrer"><code>{commit.sha.slice(0, 7)}</code> {commit.message}</a>
                  <p className="muted small">{status.label} · {new Date(commit.date).toLocaleString()}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
