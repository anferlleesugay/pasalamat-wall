// Password login for the Release Studio using a signed, expiring token.
const crypto = require('node:crypto');

const TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

function sameText(a, b) {
  // Compare hashes so the check takes the same time whatever the input (no timing leaks)
  const hashA = crypto.createHash('sha256').update(String(a)).digest();
  const hashB = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

function sign(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

function issueToken(secret, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ exp: now + TOKEN_TTL_MS })).toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}

function verifyToken(token, secret, now = Date.now()) {
  if (typeof token !== 'string' || !token.includes('.')) return false;
  const [payload, signature] = token.split('.');
  if (!sameText(signature, sign(payload, secret))) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return typeof exp === 'number' && exp > now;
  } catch {
    return false;
  }
}

// Simple brute-force protection: 5 wrong passwords per IP -> wait 5 minutes
function createLoginLimiter({ maxAttempts = 5, windowMs = 5 * 60 * 1000 } = {}) {
  const attempts = new Map();
  return {
    isBlocked(ip, now = Date.now()) {
      const entry = attempts.get(ip);
      return Boolean(entry && entry.count >= maxAttempts && now - entry.first < windowMs);
    },
    fail(ip, now = Date.now()) {
      const entry = attempts.get(ip);
      if (!entry || now - entry.first >= windowMs) attempts.set(ip, { count: 1, first: now });
      else entry.count += 1;
    },
    reset(ip) {
      attempts.delete(ip);
    },
  };
}

module.exports = { sameText, issueToken, verifyToken, createLoginLimiter, TOKEN_TTL_MS };
