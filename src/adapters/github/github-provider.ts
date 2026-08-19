import { randomBytes } from "node:crypto";
import { callbackUrl, providerCredentials } from "@/adapters/config/provider-config";
import { BranchChangedError, type ConnectedAccount } from "@/core/domain/provider";
import type { BranchReference, ProviderAuthorization, ProviderToken, ScmProvider, WriteFileInput, WriteFilesInput } from "@/core/ports/scm-provider";

const githubUrl = "https://github.com";
const githubApiUrl = "https://api.github.com";

export class GitHubProvider implements ScmProvider {
  readonly id = "github" as const;

  beginAuthorization(): ProviderAuthorization {
    const state = randomBytes(32).toString("base64url");
    const credentials = providerCredentials(this.id);
    const url = new URL(`${githubUrl}/login/oauth/authorize`);
    url.search = new URLSearchParams({
      client_id: credentials.clientId,
      redirect_uri: callbackUrl(this.id),
      state,
    }).toString();
    return { authorizationUrl: url.toString(), transaction: { state } };
  }

  async exchangeAuthorizationCode(input: { code: string }): Promise<ProviderToken> {
    const credentials = providerCredentials(this.id);
    const response = await fetch(`${githubUrl}/login/oauth/access_token`, {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        code: input.code,
        redirect_uri: callbackUrl(this.id),
      }),
      cache: "no-store",
    });
    const payload = (await response.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
    if (!response.ok || !payload.access_token) throw new Error("GitHub did not issue a user access token.");
    return {
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token,
      expiresAt: payload.expires_in ? new Date(Date.now() + payload.expires_in * 1000).toISOString() : undefined,
    };
  }

  async getConnectedAccount(accessToken: string): Promise<ConnectedAccount> {
    const response = await fetch(`${githubApiUrl}/user`, {
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${accessToken}`,
        "x-github-api-version": "2022-11-28",
      },
      cache: "no-store",
    });
    const payload = (await response.json()) as { login?: string; name?: string | null };
    if (!response.ok || !payload.login) throw new Error("GitHub profile could not be loaded.");
    return { provider: this.id, login: payload.login, displayName: payload.name ?? null, connectedAt: new Date().toISOString() };
  }

  async listBranches(accessToken: string, project: string): Promise<BranchReference[]> {
    const response = await fetch(`${githubApiUrl}/repos/${project}/branches?per_page=100`, { headers: this.headers(accessToken), cache: "no-store" });
    const payload = (await response.json()) as Array<{ name?: string; commit?: { sha?: string } }>;
    if (!response.ok) throw new Error("GitHub branches could not be loaded.");
    return payload.flatMap((branch) => branch.name && branch.commit?.sha ? [{ name: branch.name, commit: branch.commit.sha }] : []);
  }

  async readFile(accessToken: string, project: string, branch: string, path: string) {
    const response = await fetch(`${githubApiUrl}/repos/${project}/contents/${path}?ref=${encodeURIComponent(branch)}`, { headers: this.headers(accessToken), cache: "no-store" });
    const payload = (await response.json()) as { content?: string; encoding?: string };
    if (!response.ok || payload.encoding !== "base64" || !payload.content) throw new Error(`GitHub file could not be loaded: ${path}`);
    return Buffer.from(payload.content, "base64").toString("utf8");
  }

  async writeFile(accessToken: string, input: WriteFileInput): Promise<BranchReference> {
    return this.writeFiles(accessToken, { ...input, files: [{ path: input.path, content: input.content }] });
  }

  async writeFiles(accessToken: string, input: WriteFilesInput): Promise<BranchReference> {
    const branch = await this.branch(accessToken, input.project, input.branch);
    if (branch.commit !== input.expectedBranchCommit) throw new BranchChangedError();
    const commitResponse = await fetch(`${githubApiUrl}/repos/${input.project}/git/commits/${branch.commit}`, { headers: this.headers(accessToken), cache: "no-store" });
    const commitPayload = (await commitResponse.json()) as { tree?: { sha?: string } };
    if (!commitResponse.ok || !commitPayload.tree?.sha) throw new Error("GitHub branch tree could not be prepared for update.");
    const blobs = await Promise.all(input.files.map(async (file) => {
      const response = await fetch(`${githubApiUrl}/repos/${input.project}/git/blobs`, {
        method: "POST", headers: { ...this.headers(accessToken), "content-type": "application/json" },
        body: JSON.stringify({ content: file.content, encoding: "utf-8" }), cache: "no-store",
      });
      const payload = (await response.json()) as { sha?: string };
      if (!response.ok || !payload.sha) throw new Error(`GitHub could not prepare ${file.path}.`);
      return { path: file.path, mode: "100644", type: "blob", sha: payload.sha };
    }));
    const treeResponse = await fetch(`${githubApiUrl}/repos/${input.project}/git/trees`, {
      method: "POST",
      headers: { ...this.headers(accessToken), "content-type": "application/json" },
      body: JSON.stringify({ base_tree: commitPayload.tree.sha, tree: blobs }),
      cache: "no-store",
    });
    const treePayload = (await treeResponse.json()) as { sha?: string };
    if (!treeResponse.ok || !treePayload.sha) throw new Error("GitHub could not prepare the tracking tree.");
    const newCommitResponse = await fetch(`${githubApiUrl}/repos/${input.project}/git/commits`, {
      method: "POST", headers: { ...this.headers(accessToken), "content-type": "application/json" },
      body: JSON.stringify({ message: input.message, tree: treePayload.sha, parents: [branch.commit] }), cache: "no-store",
    });
    const newCommitPayload = (await newCommitResponse.json()) as { sha?: string };
    if (!newCommitResponse.ok || !newCommitPayload.sha) throw new Error("GitHub could not create the tracking update commit.");
    const updateResponse = await fetch(`${githubApiUrl}/repos/${input.project}/git/refs/heads/${encodeURIComponent(input.branch)}`, {
      method: "PATCH", headers: { ...this.headers(accessToken), "content-type": "application/json" },
      body: JSON.stringify({ sha: newCommitPayload.sha, force: false }), cache: "no-store",
    });
    if (updateResponse.status === 409 || updateResponse.status === 422) throw new BranchChangedError();
    if (!updateResponse.ok) throw new Error("GitHub could not update the tracking branch.");
    return { name: input.branch, commit: newCommitPayload.sha };
  }

  private async branch(accessToken: string, project: string, branchName: string): Promise<BranchReference> {
    const response = await fetch(`${githubApiUrl}/repos/${project}/branches/${encodeURIComponent(branchName)}`, { headers: this.headers(accessToken), cache: "no-store" });
    const payload = (await response.json()) as { name?: string; commit?: { sha?: string } };
    if (!response.ok || !payload.name || !payload.commit?.sha) throw new Error("GitHub branch could not be reloaded before saving.");
    return { name: payload.name, commit: payload.commit.sha };
  }

  private headers(accessToken: string) {
    return { accept: "application/vnd.github+json", authorization: `Bearer ${accessToken}`, "x-github-api-version": "2022-11-28" };
  }
}
