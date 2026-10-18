// Minimal GitHub REST client: read a file, commit a new version, read history.

class GitHubError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function createGitHub({ token, repo, branch = 'main', fetchImpl = fetch }) {
  const base = `https://api.github.com/repos/${repo}`;

  async function call(path, options = {}) {
    const response = await fetchImpl(`${base}${path}`, {
      ...options,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'pasalamat-studio-api',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
    if (!response.ok) {
      const text = await response.text();
      throw new GitHubError(response.status, `GitHub ${response.status}: ${text.slice(0, 200)}`);
    }
    return response.json();
  }

  return {
    async getJsonFile(filePath) {
      const data = await call(`/contents/${filePath}?ref=${encodeURIComponent(branch)}`);
      const text = Buffer.from(data.content, 'base64').toString('utf8');
      return { content: JSON.parse(text), sha: data.sha };
    },

    async putJsonFile(filePath, content, sha, message) {
      const data = await call(`/contents/${filePath}`, {
        method: 'PUT',
        body: JSON.stringify({
          message,
          branch,
          sha, // GitHub rejects the commit (409) if the file changed since we read it
          content: Buffer.from(`${JSON.stringify(content, null, 2)}\n`).toString('base64'),
        }),
      });
      return { sha: data.commit.sha, url: data.commit.html_url };
    },

    async listCommits(filePath, count = 5) {
      const data = await call(`/commits?path=${encodeURIComponent(filePath)}&sha=${encodeURIComponent(branch)}&per_page=${count}`);
      return data.map((c) => ({
        sha: c.sha,
        message: c.commit.message.split('\n')[0],
        date: c.commit.author?.date,
        url: c.html_url,
      }));
    },

    async listCommitComments(sha) {
      const data = await call(`/commits/${sha}/comments`);
      return data.map((c) => ({ body: c.body, date: c.created_at }));
    },
  };
}

module.exports = { createGitHub, GitHubError };
