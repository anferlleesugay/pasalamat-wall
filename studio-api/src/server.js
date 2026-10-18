const { loadConfig } = require('./config');
const { createGitHub } = require('./github');
const { createApp } = require('./app');

const config = loadConfig();
const github = createGitHub({ token: config.githubToken, repo: config.repo, branch: config.branch });
const app = createApp({ config, github });

app.listen(config.port, () => {
  console.log(`studio-api listening on ${config.port} (repo ${config.repo}@${config.branch}, AI ${config.geminiApiKey ? 'enabled' : 'disabled'})`);
});
