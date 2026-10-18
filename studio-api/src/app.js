const express = require('express');
const { SITE_PATH, unknownFields, validateSite, diffSite } = require('./site');
const { generateCommitMessage } = require('./commitMessage');
const { sameText, issueToken, verifyToken, createLoginLimiter } = require('./auth');

function createApp({ config, github, messageGenerator = generateCommitMessage, log = console }) {
  const app = express();
  const limiter = createLoginLimiter();
  app.use(express.json({ limit: '10kb' }));

  app.get('/health', (req, res) => {
    res.json({ status: 'UP', repo: config.repo, ai: Boolean(config.geminiApiKey) });
  });

  app.post('/api/studio/login', (req, res) => {
    const ip = req.ip;
    if (limiter.isBlocked(ip)) {
      return res.status(429).json({ error: 'Too many attempts. Try again in a few minutes.' });
    }
    if (!sameText(req.body?.password ?? '', config.studioPassword)) {
      limiter.fail(ip);
      return res.status(401).json({ error: 'Wrong password' });
    }
    limiter.reset(ip);
    return res.json({ token: issueToken(config.studioSecret) });
  });

  // Everything below needs a valid token: "Authorization: Bearer <token>"
  function requireAuth(req, res, next) {
    const token = (req.get('authorization') || '').replace(/^Bearer /, '');
    if (!verifyToken(token, config.studioSecret)) {
      return res.status(401).json({ error: 'Please log in to the Release Studio' });
    }
    return next();
  }

  app.get('/api/studio/site', requireAuth, async (req, res, next) => {
    try {
      const { content } = await github.getJsonFile(SITE_PATH);
      res.json({ site: content });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/studio/ship', requireAuth, async (req, res, next) => {
    try {
      const site = req.body?.site;
      const bypassValidation = req.body?.bypassValidation === true;
      if (!site || typeof site !== 'object' || Array.isArray(site)) {
        return res.status(400).json({ error: 'Missing site content' });
      }
      const unknown = unknownFields(site);
      if (unknown.length) {
        return res.status(400).json({ error: `Unknown fields: ${unknown.join(', ')}` });
      }

      const current = await github.getJsonFile(SITE_PATH);
      const updated = { ...current.content, ...site };

      if (!bypassValidation) {
        const errors = validateSite(updated);
        if (errors.length) return res.status(400).json({ error: 'Invalid content', errors });
      }

      const changes = diffSite(current.content, updated);
      if (!changes.length) return res.status(400).json({ error: 'Nothing changed' });

      const { message, source } = await messageGenerator(changes, {
        apiKey: config.geminiApiKey,
        model: config.geminiModel,
        timeoutMs: config.geminiTimeoutMs,
        log,
      });
      const body = [
        message,
        '',
        ...changes.map((c) => `- ${c.field}: ${JSON.stringify(c.from)} -> ${JSON.stringify(c.to)}`),
        ...(bypassValidation ? ['', 'Note: validation bypassed in Release Studio (quality-gate demo).'] : []),
        '',
        `Shipped-via: Release Studio (message by ${source === 'ai' ? 'Gemini' : 'template'})`,
      ].join('\n');

      const commit = await github.putJsonFile(SITE_PATH, updated, current.sha, body);
      log.info(`shipped ${commit.sha.slice(0, 7)}: ${message}`);
      return res.status(201).json({
        commitSha: commit.sha,
        commitUrl: commit.url,
        message,
        messageSource: source,
        changes,
        bypassedValidation: bypassValidation,
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/studio/history', requireAuth, async (req, res, next) => {
    try {
      const commits = await github.listCommits(SITE_PATH, 5);
      const withBuilds = await Promise.all(
        commits.map(async (commit) => {
          const comments = await github.listCommitComments(commit.sha);
          const latest = comments[comments.length - 1];
          return { ...commit, build: latest ? latest.body : null };
        }),
      );
      res.json({ commits: withBuilds });
    } catch (error) {
      next(error);
    }
  });

  // One place that turns errors into JSON responses
  // eslint-disable-next-line no-unused-vars
  app.use((error, req, res, next) => {
    if (error.status === 409) {
      return res.status(409).json({ error: 'Someone else changed the site. Reload and try again.' });
    }
    if (error.status === 401 || error.status === 403) {
      log.error(error.message);
      return res.status(502).json({ error: 'GitHub rejected the token. Check GITHUB_TOKEN.' });
    }
    if (error.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
    log.error(error.message);
    return res.status(502).json({ error: 'Could not reach GitHub. Try again.' });
  });

  return app;
}

module.exports = { createApp };
