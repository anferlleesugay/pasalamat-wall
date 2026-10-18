const { templateMessage, sanitize, generateCommitMessage } = require('../src/commitMessage');

const changes = [{ field: 'headline', from: 'Old', to: 'Salamat, NU Clark!' }];
const quietLog = { warn: jest.fn() };

function fakeFetch(reply, { ok = true, status = 200 } = {}) {
  return jest.fn().mockResolvedValue({
    ok,
    status,
    json: async () => ({ candidates: [{ content: { parts: [{ text: reply }] } }] }),
    text: async () => 'error body',
  });
}

test('template for a single headline change', () => {
  expect(templateMessage(changes)).toBe('feat(site): update headline to "Salamat, NU Clark!"');
});

test('template for a theme color change uses style type', () => {
  expect(templateMessage([{ field: 'themeColor', from: '#000000', to: '#2E7D32' }]))
    .toBe('style(site): change theme color to #2E7D32');
});

test('template for several changes lists the fields', () => {
  expect(templateMessage([{ field: 'headline' }, { field: 'tagline' }]))
    .toBe('feat(site): update headline, tagline');
});

test('sanitize keeps a valid conventional commit', () => {
  expect(sanitize('feat(site): greet teachers on the wall\n')).toBe('feat(site): greet teachers on the wall');
});

test('sanitize strips quotes and trailing period', () => {
  expect(sanitize('"style(site): switch to green theme."')).toBe('style(site): switch to green theme');
});

test('sanitize rejects text that is not a conventional commit', () => {
  expect(sanitize('Here is your commit message!')).toBeNull();
});

test('no API key uses the template without calling the AI', async () => {
  const fetchImpl = jest.fn();
  const result = await generateCommitMessage(changes, { apiKey: '', model: 'm', fetchImpl });
  expect(result.source).toBe('template');
  expect(fetchImpl).not.toHaveBeenCalled();
});

test('valid AI reply is used', async () => {
  const fetchImpl = fakeFetch('feat(site): welcome NU Clark on the headline');
  const result = await generateCommitMessage(changes, { apiKey: 'k', model: 'gemini-x', fetchImpl, log: quietLog });
  expect(result).toEqual({ message: 'feat(site): welcome NU Clark on the headline', source: 'ai' });
  expect(fetchImpl.mock.calls[0][0]).toContain('gemini-x:generateContent');
});

test('AI HTTP error falls back to the template', async () => {
  const fetchImpl = fakeFetch('', { ok: false, status: 404 });
  const result = await generateCommitMessage(changes, { apiKey: 'k', model: 'm', fetchImpl, log: quietLog });
  expect(result.source).toBe('template');
});

test('AI network error falls back to the template', async () => {
  const fetchImpl = jest.fn().mockRejectedValue(new Error('timeout'));
  const result = await generateCommitMessage(changes, { apiKey: 'k', model: 'm', fetchImpl, log: quietLog });
  expect(result.source).toBe('template');
});

test('AI reply in the wrong format falls back to the template', async () => {
  const fetchImpl = fakeFetch('Sure! Here is a commit message for you.');
  const result = await generateCommitMessage(changes, { apiKey: 'k', model: 'm', fetchImpl, log: quietLog });
  expect(result.source).toBe('template');
});
