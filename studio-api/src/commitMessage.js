// Builds the commit message: Gemini writes it, a template is the fallback.

const GEMINI_URL = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const ALLOWED = /^(feat|fix|style|chore|docs)\(site\): \S.*$/;
const MAX_LENGTH = 72;

function shorten(value, max = 30) {
  const text = String(value ?? '');
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function templateMessage(changes) {
  if (changes.length === 1) {
    const { field, to } = changes[0];
    if (field === 'themeColor') return `style(site): change theme color to ${to}`;
    if (field === 'versionLabel') return `chore(site): bump version label to ${to}`;
    return `feat(site): update ${field} to "${shorten(to)}"`;
  }
  return `feat(site): update ${changes.map((c) => c.field).join(', ')}`.slice(0, MAX_LENGTH);
}

function buildPrompt(changes) {
  const lines = changes.map((c) => `- ${c.field}: "${c.from ?? ''}" -> "${c.to}"`).join('\n');
  return [
    'Write ONE git commit message line in Conventional Commits format for this website content change.',
    'Rules: start with feat(site):, fix(site):, style(site):, or chore(site):',
    `then a short imperative summary. Maximum ${MAX_LENGTH} characters. No quotes around the whole line, no period at the end.`,
    'Changes:',
    lines,
  ].join('\n');
}

function sanitize(text) {
  if (typeof text !== 'string') return null;
  const line = text.trim().split('\n')[0].trim().replace(/^[`"']+|[`"']+$/g, '').replace(/\.$/, '');
  if (!ALLOWED.test(line) || line.length > MAX_LENGTH) return null;
  return line;
}

async function generateCommitMessage(changes, { apiKey, model, fetchImpl = fetch, timeoutMs = 10000, log = console } = {}) {
  const fallback = { message: templateMessage(changes), source: 'template' };
  if (!apiKey) return fallback;
  try {
    const response = await fetchImpl(GEMINI_URL(model), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(changes) }] }],
        generationConfig: { temperature: 0.2 },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) {
      log.warn(`AI commit message failed: HTTP ${response.status} ${(await response.text()).slice(0, 200)}`);
      return fallback;
    }
    const data = await response.json();
    const message = sanitize(data?.candidates?.[0]?.content?.parts?.[0]?.text);
    if (!message) {
      log.warn('AI commit message was not a valid conventional commit; using template');
      return fallback;
    }
    return { message, source: 'ai' };
  } catch (error) {
    log.warn(`AI commit message failed: ${error.message}`);
    return fallback;
  }
}

module.exports = { templateMessage, buildPrompt, sanitize, generateCommitMessage, MAX_LENGTH };
