const { issueToken, verifyToken, createLoginLimiter, TOKEN_TTL_MS } = require('../src/auth');

test('a fresh token is valid', () => {
  expect(verifyToken(issueToken('secret'), 'secret')).toBe(true);
});

test('a token signed with another secret is rejected', () => {
  expect(verifyToken(issueToken('other'), 'secret')).toBe(false);
});

test('an expired token is rejected', () => {
  const token = issueToken('secret', 0);
  expect(verifyToken(token, 'secret', TOKEN_TTL_MS + 1)).toBe(false);
});

test('a tampered token is rejected', () => {
  const [, signature] = issueToken('secret').split('.');
  const fakePayload = Buffer.from(JSON.stringify({ exp: Date.now() * 2 })).toString('base64url');
  expect(verifyToken(`${fakePayload}.${signature}`, 'secret')).toBe(false);
});

test('limiter blocks after 5 failures and unblocks after the window', () => {
  const limiter = createLoginLimiter({ maxAttempts: 5, windowMs: 1000 });
  for (let i = 0; i < 5; i += 1) limiter.fail('1.2.3.4', 0);
  expect(limiter.isBlocked('1.2.3.4', 10)).toBe(true);
  expect(limiter.isBlocked('1.2.3.4', 2000)).toBe(false);
});
