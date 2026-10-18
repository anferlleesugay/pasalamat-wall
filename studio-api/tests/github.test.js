const { createGitHub } = require('../src/github');

function jsonResponse(data, status = 200) {
  return { ok: status < 400, status, json: async () => data, text: async () => JSON.stringify(data) };
}

test('getJsonFile decodes base64 content', async () => {
  const encoded = Buffer.from('{"headline":"Hi there"}').toString('base64');
  const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({ content: encoded, sha: 's1' }));
  const gh = createGitHub({ token: 't', repo: 'me/repo', fetchImpl });

  const file = await gh.getJsonFile('frontend/src/site.json');

  expect(file).toEqual({ content: { headline: 'Hi there' }, sha: 's1' });
  expect(fetchImpl.mock.calls[0][0]).toBe('https://api.github.com/repos/me/repo/contents/frontend/src/site.json?ref=main');
  expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBe('Bearer t');
});

test('putJsonFile sends base64 JSON with the previous sha', async () => {
  const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({ commit: { sha: 'c1', html_url: 'u1' } }));
  const gh = createGitHub({ token: 't', repo: 'me/repo', fetchImpl });

  const result = await gh.putJsonFile('f.json', { a: 1 }, 'old-sha', 'feat(site): x');

  const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
  expect(body.sha).toBe('old-sha');
  expect(body.message).toBe('feat(site): x');
  expect(Buffer.from(body.content, 'base64').toString()).toBe('{\n  "a": 1\n}\n');
  expect(result).toEqual({ sha: 'c1', url: 'u1' });
});

test('GitHub errors carry the HTTP status', async () => {
  const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({ message: 'Bad credentials' }, 401));
  const gh = createGitHub({ token: 'bad', repo: 'me/repo', fetchImpl });
  await expect(gh.getJsonFile('f.json')).rejects.toMatchObject({ status: 401 });
});
