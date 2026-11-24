import { createSign } from "node:crypto";

const API = "https://api.github.com";
const OWNER = "Decker143";
const REPOSITORY = "kanako-ai";
const DEFAULT_BASE_BRANCH = "feature/task-center-register";

type GitHubFile = { path: string; sha: string; content?: string };

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing GitHub App configuration: ${name}`);
  return value;
}

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString("base64").replace(/=/g, "").replace(/\\+/g, "-").replace(/\\//g, "_");
}

function createAppJwt() {
  const appId = requiredEnv("KANAKO_GITHUB_APP_ID");
  const privateKey = requiredEnv("KANAKO_GITHUB_APP_PRIVATE_KEY").replace(/\\n/g, "\n");
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({ iat: now - 60, exp: now + 8 * 60, iss: appId }));
  const unsigned = header + "." + payload;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  return unsigned + "." + base64url(signer.sign(privateKey));
}

async function installationToken() {
  const installationId = requiredEnv("KANAKO_GITHUB_INSTALLATION_ID");
  const jwt = createAppJwt();
  const response = await fetch(`${API}/app/installations/${installationId}/access_tokens`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${jwt}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      repositories: [REPOSITORY],
      permissions: { contents: "write", pull_requests: "write" },
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("GitHub App could not obtain a repository installation token.");
  const data = await response.json() as { token?: string };
  if (!data.token) throw new Error("GitHub returned an invalid installation token.");
  return data.token;
}

async function githubRequest<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(API + path, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    const status = response.status;
    if (status === 404) throw new Error("GitHub resource was not found or is outside the installed repository.");
    if (status === 409) throw new Error("GitHub reported a conflict. Refresh the branch and retry.");
    if (status === 422) throw new Error("GitHub rejected the requested change. Check the branch, file path, or pull request.");
    throw new Error(`GitHub request failed (HTTP ${status}).`);
  }
  return response.status === 204 ? ({} as T) : await response.json() as T;
}

function assertRepo() {
  const configured = process.env.KANAKO_GITHUB_REPOSITORY || `${OWNER}/${REPOSITORY}`;
  if (configured !== `${OWNER}/${REPOSITORY}`) {
    throw new Error("KANAKO GitHub integration is restricted to its approved repository.");
  }
}

function validateBranch(branch: string, write = false) {
  if (typeof branch !== "string" || branch.length > 120 || !/^[A-Za-z0-9._/-]+$/.test(branch) || branch.includes("..")) {
    throw new Error("Invalid GitHub branch name.");
  }
  if (write && !branch.startsWith("kanako/")) {
    throw new Error("Nicole may write only to task-scoped kanako/ branches.");
  }
}

function validatePath(path: string) {
  if (typeof path !== "string" || path.length < 1 || path.length > 240 || path.startsWith("/") ||
      path.split("/").some(part => !part || part === "." || part === "..") ||
      path.split("/").some(part => part.toLowerCase() === ".git") ||
      /^\.env(?:\.|$)/i.test(path) || /(^|\/)(?:secrets?|credentials?)(?:\/|\.|$)/i.test(path)) {
    throw new Error("This repository path is not allowed.");
  }
}

export async function createKanakoGitHubTools() {
  assertRepo();
  const token = await installationToken();
  const baseBranch = process.env.KANAKO_GITHUB_BASE_BRANCH || DEFAULT_BASE_BRANCH;
  const api = {
    async createTaskBranch(taskId: string) {
      if (!/^[0-9a-f-]{16,64}$/i.test(taskId)) throw new Error("Invalid task identifier.");
      const branch = `kanako/task-${taskId.slice(0, 8)}-${Date.now().toString(36)}`;
      const ref = await githubRequest<{ object: { sha: string } }>(
        token, `/repos/${OWNER}/${REPOSITORY}/git/ref/heads/${encodeURIComponent(baseBranch)}`,
      );
      await githubRequest(token, `/repos/${OWNER}/${REPOSITORY}/git/refs`, {
        method: "POST",
        body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: ref.object.sha }),
      });
      return { branch, baseBranch, message: "Created an isolated task branch. The base branch was not changed." };
    },
    async readFile(path: string, ref: string) {
      validatePath(path);
      validateBranch(ref);
      const data = await githubRequest<{ path: string; sha: string; content?: string; encoding?: string }>(
        token, `/repos/${OWNER}/${REPOSITORY}/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(ref)}`,
      );
      if (Array.isArray(data) || data.encoding !== "base64" || !data.content) {
        throw new Error("The requested path is not a readable text file.");
      }
      return { path: data.path, sha: data.sha, content: Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf8").slice(0, 30000) };
    },
    async writeFile(path: string, content: string, message: string, branch: string) {
      validatePath(path);
      validateBranch(branch, true);
      if (typeof content !== "string" || content.length > 100000) throw new Error("File content exceeds the 100 KB safety limit.");
      if (typeof message !== "string" || message.trim().length < 5 || message.length > 120) throw new Error("Provide a concise commit message.");
      let sha: string | undefined;
      try {
        const existing = await githubRequest<{ sha: string }>(
          token, `/repos/${OWNER}/${REPOSITORY}/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(branch)}`,
        );
        sha = existing.sha;
      } catch (error) {
        if (!(error instanceof Error) || !error.message.startsWith("GitHub resource was not found")) throw error;
      }
      const result = await githubRequest<{ commit: { sha: string }; content: { sha: string } }>(
        token, `/repos/${OWNER}/${REPOSITORY}/contents/${path.split("/").map(encodeURIComponent).join("/")}`,
        { method: "PUT", body: JSON.stringify({
          message: message.trim(), content: Buffer.from(content, "utf8").toString("base64"),
          branch, ...(sha ? { sha } : {}),
        }) },
      );
      return { path, branch, commitSha: result.commit.sha, message: "File committed to the isolated task branch only." };
    },
    async createPullRequest(title: string, body: string, head: string) {
      validateBranch(head, true);
      if (typeof title !== "string" || title.trim().length < 5 || title.length > 120 ||
          typeof body !== "string" || body.length > 10000) throw new Error("Invalid pull request title or description.");
      const result = await githubRequest<{ number: number; html_url: string; state: string }>(
        token, `/repos/${OWNER}/${REPOSITORY}/pulls`,
        { method: "POST", body: JSON.stringify({
          title: title.trim(), body: body.slice(0, 10000), head, base: baseBranch, draft: true,
        }) },
      );
      return { number: result.number, url: result.html_url, state: result.state, draft: true, message: "Draft pull request created for owner review. It was not merged." };
    },
  };
  return api;
}

export async function checkKanakoGitHubConnection() {
  assertRepo();
  const token = await installationToken();
  const repo = await githubRequest<{ full_name: string; permissions?: { contents?: string; pull_requests?: string } }>(
    token, `/repos/${OWNER}/${REPOSITORY}`,
  );
  return {
    connected: repo.full_name === `${OWNER}/${REPOSITORY}`,
    repository: repo.full_name,
    permissions: repo.permissions ?? {},
    baseBranch: process.env.KANAKO_GITHUB_BASE_BRANCH || DEFAULT_BASE_BRANCH,
  };
}
