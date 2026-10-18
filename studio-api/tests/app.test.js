const request = require('supertest');
const { createApp } = require('../src/app');

const config = {
  studioPassword: 'letmein',
  studioSecret: 'test-secret',
  repo: 'demo/repo',
  geminiApiKey: '',
  geminiModel: 'm',
};

const currentSite = {
  headline: 'Pasalamat Wall',
  tagline: 'Say thank you',
  themeColor: '#2E7D32',
  versionLabel: 'v1.0.0',
  announcement: '',
};

const quietLog = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

function fakeGitHub(overrides = {}) {
  return {
    getJsonFile: jest.fn().mockResolvedValue({ content: { ...currentSite }, sha: 'file-sha' }),
    putJsonFile: jest.fn().mockResolvedValue({ sha: 'abc1234def', url: 'https://github.com/demo/repo/commit/abc1234def' }),
    listCommits: jest.fn().mockResolvedValue([{ sha: 'c1', message: 'feat(site): x', date: 'd', url: 'u' }]),
    listCommitComments: jest.fn().mockResolvedValue([{ body: '✅ Build #12 passed', date: 'd' }]),
    ...overrides,
  };
}

const fakeMessage = jest.fn().mockResolvedValue({ message: 'feat(site): say salamat', source: 'ai' });

async function login(app) {
  const res = await request(app).post('/api/studio/login').send({ password: 'letmein' });
  return res.body.token;
}

test('health is public', async () => {
  const app = createApp({ config, github: fakeGitHub(), log: quietLog });
  const res = await request(app).get('/health');
  expect(res.status).toBe(200);
  expect(res.body.status).toBe('UP');
});

test('wrong password is rejected', async () => {
  const app = createApp({ config, github: fakeGitHub(), log: quietLog });
  const res = await request(app).post('/api/studio/login').send({ password: 'nope' });
  expect(res.status).toBe(401);
});

test('studio routes need a token', async () => {
  const app = createApp({ config, github: fakeGitHub(), log: quietLog });
  const res = await request(app).get('/api/studio/site');
  expect(res.status).toBe(401);
});

test('ship commits the change with the generated message', async () => {
  const github = fakeGitHub();
  const app = createApp({ config, github, messageGenerator: fakeMessage, log: quietLog });
  const token = await login(app);

  const res = await request(app)
    .post('/api/studio/ship')
    .set('Authorization', `Bearer ${token}`)
    .send({ site: { headline: 'Salamat, NU Clark!' } });

  expect(res.status).toBe(201);
  expect(res.body.message).toBe('feat(site): say salamat');
  const [path, content, sha, body] = github.putJsonFile.mock.calls[0];
  expect(path).toBe('frontend/src/site.json');
  expect(content.headline).toBe('Salamat, NU Clark!');
  expect(sha).toBe('file-sha');
  expect(body).toContain('Shipped-via: Release Studio (message by Gemini)');
});

test('invalid content is blocked before committing', async () => {
  const github = fakeGitHub();
  const app = createApp({ config, github, messageGenerator: fakeMessage, log: quietLog });
  const token = await login(app);

  const res = await request(app)
    .post('/api/studio/ship')
    .set('Authorization', `Bearer ${token}`)
    .send({ site: { themeColor: '#zzz' } });

  expect(res.status).toBe(400);
  expect(res.body.errors[0].field).toBe('themeColor');
  expect(github.putJsonFile).not.toHaveBeenCalled();
});

test('bypassValidation lets a bad value through for the quality-gate demo', async () => {
  const github = fakeGitHub();
  const app = createApp({ config, github, messageGenerator: fakeMessage, log: quietLog });
  const token = await login(app);

  const res = await request(app)
    .post('/api/studio/ship')
    .set('Authorization', `Bearer ${token}`)
    .send({ site: { themeColor: '#zzz' }, bypassValidation: true });

  expect(res.status).toBe(201);
  expect(github.putJsonFile.mock.calls[0][3]).toContain('validation bypassed');
});

test('unknown fields are rejected', async () => {
  const app = createApp({ config, github: fakeGitHub(), messageGenerator: fakeMessage, log: quietLog });
  const token = await login(app);
  const res = await request(app)
    .post('/api/studio/ship')
    .set('Authorization', `Bearer ${token}`)
    .send({ site: { script: 'rm -rf /' } });
  expect(res.status).toBe(400);
});

test('shipping with no changes is rejected', async () => {
  const github = fakeGitHub();
  const app = createApp({ config, github, messageGenerator: fakeMessage, log: quietLog });
  const token = await login(app);
  const res = await request(app)
    .post('/api/studio/ship')
    .set('Authorization', `Bearer ${token}`)
    .send({ site: { headline: 'Pasalamat Wall' } });
  expect(res.status).toBe(400);
  expect(github.putJsonFile).not.toHaveBeenCalled();
});

test('a GitHub conflict returns 409', async () => {
  const conflict = Object.assign(new Error('conflict'), { status: 409 });
  const github = fakeGitHub({ putJsonFile: jest.fn().mockRejectedValue(conflict) });
  const app = createApp({ config, github, messageGenerator: fakeMessage, log: quietLog });
  const token = await login(app);
  const res = await request(app)
    .post('/api/studio/ship')
    .set('Authorization', `Bearer ${token}`)
    .send({ site: { headline: 'Brand new headline' } });
  expect(res.status).toBe(409);
});

test('history includes the latest build comment', async () => {
  const app = createApp({ config, github: fakeGitHub(), log: quietLog });
  const token = await login(app);
  const res = await request(app).get('/api/studio/history').set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body.commits[0].build).toBe('✅ Build #12 passed');
});

test('login is blocked after too many wrong passwords', async () => {
  const app = createApp({ config, github: fakeGitHub(), log: quietLog });
  for (let i = 0; i < 5; i += 1) {
    await request(app).post('/api/studio/login').send({ password: 'wrong' });
  }
  const res = await request(app).post('/api/studio/login').send({ password: 'letmein' });
  expect(res.status).toBe(429);
});
