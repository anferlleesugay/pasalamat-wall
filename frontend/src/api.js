async function request(url, { token, ...options } = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `Request failed (${response.status})`);
    error.status = response.status;
    error.details = data.errors;
    throw error;
  }
  return data;
}

export const notesApi = {
  list: () => request('/api/notes'),
  create: (note) => request('/api/notes', { method: 'POST', body: JSON.stringify(note) }),
  heart: (id) => request(`/api/notes/${id}/hearts`, { method: 'POST' }),
};

export const studioApi = {
  login: (password) => request('/api/studio/login', { method: 'POST', body: JSON.stringify({ password }) }),
  getSite: (token) => request('/api/studio/site', { token }),
  ship: (token, site, bypassValidation) =>
    request('/api/studio/ship', { token, method: 'POST', body: JSON.stringify({ site, bypassValidation }) }),
  history: (token) => request('/api/studio/history', { token }),
};
