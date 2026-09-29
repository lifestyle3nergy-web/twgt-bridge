// twgt-bridge read-only collector.
// Every GitHub call in this file uses GET. Nothing here mutates remote state.
// If you are about to add a non-GET method, stop. Read the README first.

const API = "https://api.github.com";
export const BRIDGE_VERSION = "0.1.0";

export class CollectorError extends Error {
  constructor(code, message, detail) {
    super(message);
    this.name = "CollectorError";
    this.code = code;
    this.detail = detail;
  }
}

export function makeClient(token) {
  if (!token || typeof token !== "string" || token.length < 10) {
    throw new CollectorError("MISSING_TOKEN", "GITHUB_TOKEN is required and must be a non-empty string");
  }
  return async function get(path) {
    if (!path.startsWith("/")) {
      throw new CollectorError("BAD_PATH", `path must start with "/", got: ${path}`);
    }
    let res;
    try {
      res = await fetch(`${API}${path}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": `twgt-bridge/${BRIDGE_VERSION}`,
        },
      });
    } catch (e) {
      throw new CollectorError("NETWORK_ERROR", `GET ${path} failed`, String(e));
    }
    if (!res.ok) {
      throw new CollectorError("API_ERROR", `GET ${path} -> ${res.status} ${res.statusText}`, {
        status: res.status,
        statusText: res.statusText,
      });
    }
    return res.json();
  };
}

function envelope(source, payload) {
  return {
    bridge_version: BRIDGE_VERSION,
    collected_at: new Date().toISOString(),
    source,
    payload,
  };
}

export async function collectRepoMeta(client, owner, repo) {
  const meta = await client(`/repos/${owner}/${repo}`);
  const defaultBranch = meta.default_branch;
  const headRef = await client(`/repos/${owner}/${repo}/git/ref/heads/${defaultBranch}`);
  const head_sha = headRef.object.sha;
  const tree = await client(`/repos/${owner}/${repo}/git/trees/${head_sha}?recursive=1`);
  return envelope(
    { owner, repo, default_branch: defaultBranch, head_sha },
    { meta, tree }
  );
}

export async function collectFile(client, owner, repo, ref, path) {
  const content = await client(`/repos/${owner}/${repo}/contents/${path}?ref=${ref}`);
  const headRef = await client(`/repos/${owner}/${repo}/git/ref/heads/${ref}`).catch(() => null);
  return envelope(
    { owner, repo, ref, sha: headRef?.object?.sha || null, path },
    { content }
  );
}

export async function collectPulls(client, owner, repo, state = "all", limit = 30) {
  const pulls = await client(`/repos/${owner}/${repo}/pulls?state=${state}&per_page=${limit}`);
  return envelope({ owner, repo, state }, { pulls });
}

export async function collectWorkflowRuns(client, owner, repo, limit = 30) {
  const runs = await client(`/repos/${owner}/${repo}/actions/runs?per_page=${limit}`);
  return envelope({ owner, repo }, { runs });
}

export async function collectCommits(client, owner, repo, ref, limit = 30) {
  const commits = await client(`/repos/${owner}/${repo}/commits?sha=${ref}&per_page=${limit}`);
  return envelope({ owner, repo, ref }, { commits });
}
