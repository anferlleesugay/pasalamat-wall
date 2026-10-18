function loadConfig(env = process.env) {
  const required = ['STUDIO_PASSWORD', 'STUDIO_SECRET', 'GITHUB_TOKEN', 'GITHUB_REPO'];
  const missing = required.filter((name) => !env[name]);
  if (missing.length) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
  return {
    port: Number(env.PORT || 4000),
    studioPassword: env.STUDIO_PASSWORD,
    studioSecret: env.STUDIO_SECRET,
    githubToken: env.GITHUB_TOKEN,
    repo: env.GITHUB_REPO,
    branch: env.GITHUB_BRANCH || 'main',
    geminiApiKey: env.GEMINI_API_KEY || '',
    geminiModel: env.GEMINI_MODEL || 'gemini-3.8-flash',
  };
}

module.exports = { loadConfig };
