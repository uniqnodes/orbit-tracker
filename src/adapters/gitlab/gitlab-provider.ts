import { randomBytes, createHash } from "node:crypto";
import { callbackUrl, gitlabBaseUrl, providerCredentials } from "@/adapters/config/provider-config";
import { BranchChangedError, type ConnectedAccount } from "@/core/domain/provider";
import type { BranchReference, ProviderAuthorization, ProviderToken, ScmProvider, WriteFileInput } from "@/core/ports/scm-provider";

function base64url(value: Buffer) {
  return value.toString("base64url");
}

export class GitLabProvider implements ScmProvider {
  readonly id = "gitlab" as const;

  beginAuthorization(): ProviderAuthorization {
    const state = base64url(randomBytes(32));
    const codeVerifier = base64url(randomBytes(48));
    const codeChallenge = base64url(createHash("sha256").update(codeVerifier).digest());
    const credentials = providerCredentials(this.id);
    const url = new URL(`${gitlabBaseUrl()}/oauth/authorize`);
    url.search = new URLSearchParams({
      client_id: credentials.clientId,
      redirect_uri: callbackUrl(this.id),
      response_type: "code",
      scope: "api read_user",
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    }).toString();
    return { authorizationUrl: url.toString(), transaction: { state, codeVerifier } };
  }

  async exchangeAuthorizationCode(input: { code: string; codeVerifier?: string }): Promise<ProviderToken> {
    if (!input.codeVerifier) throw new Error("GitLab authorization is missing its PKCE verifier.");
    const credentials = providerCredentials(this.id);
    const response = await fetch(`${gitlabBaseUrl()}/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        code: input.code,
        grant_type: "authorization_code",
        redirect_uri: callbackUrl(this.id),
        code_verifier: input.codeVerifier,
      }),
      cache: "no-store",
    });
    const payload = (await response.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
    if (!response.ok || !payload.access_token) throw new Error("GitLab did not issue an access token.");
    return {
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token,
      expiresAt: payload.expires_in ? new Date(Date.now() + payload.expires_in * 1000).toISOString() : undefined,
    };
  }

  async getConnectedAccount(accessToken: string): Promise<ConnectedAccount> {
    const response = await fetch(`${gitlabBaseUrl()}/api/v4/user`, {
      headers: { authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const payload = (await response.json()) as { username?: string; name?: string };
    if (!response.ok || !payload.username) throw new Error("GitLab profile could not be loaded.");
    return { provider: this.id, login: payload.username, displayName: payload.name ?? null, connectedAt: new Date().toISOString() };
  }

  async listBranches(accessToken: string, project: string): Promise<BranchReference[]> {
    const response = await fetch(`${gitlabBaseUrl()}/api/v4/projects/${encodeURIComponent(project)}/repository/branches?per_page=100`, { headers: this.headers(accessToken), cache: "no-store" });
    const payload = (await response.json()) as Array<{ name?: string; commit?: { id?: string }; can_push?: boolean }>;
    if (!response.ok) throw new Error("GitLab branches could not be loaded.");
    return payload.flatMap((branch) => branch.name && branch.commit?.id ? [{ name: branch.name, commit: branch.commit.id, canPush: branch.can_push }] : []);
  }

  async readFile(accessToken: string, project: string, branch: string, path: string) {
    const url = new URL(`${gitlabBaseUrl()}/api/v4/projects/${encodeURIComponent(project)}/repository/files/${encodeURIComponent(path)}/raw`);
    url.searchParams.set("ref", branch);
    const response = await fetch(url, { headers: this.headers(accessToken), cache: "no-store" });
    if (!response.ok) throw new Error(`GitLab file could not be loaded: ${path}`);
    return response.text();
  }

  async writeFile(accessToken: string, input: WriteFileInput): Promise<BranchReference> {
    const branch = await this.branch(accessToken, input.project, input.branch);
    if (branch.commit !== input.expectedBranchCommit) throw new BranchChangedError();
    if (!branch.canPush) throw new Error("GitLab does not allow this user to write to the selected branch.");
    const response = await fetch(`${gitlabBaseUrl()}/api/v4/projects/${encodeURIComponent(input.project)}/repository/files/${encodeURIComponent(input.path)}`, {
      method: "PUT",
      headers: { ...this.headers(accessToken), "content-type": "application/json" },
      body: JSON.stringify({ branch: input.branch, content: input.content, commit_message: input.message, last_commit_id: input.expectedBranchCommit }),
      cache: "no-store",
    });
    if (response.status === 400 || response.status === 409) throw new BranchChangedError();
    const payload = (await response.json()) as { commit_id?: string };
    if (!response.ok || !payload.commit_id) throw new Error("GitLab could not create the tracking update commit.");
    return { name: input.branch, commit: payload.commit_id, canPush: true };
  }

  private async branch(accessToken: string, project: string, branchName: string): Promise<BranchReference> {
    const response = await fetch(`${gitlabBaseUrl()}/api/v4/projects/${encodeURIComponent(project)}/repository/branches/${encodeURIComponent(branchName)}`, { headers: this.headers(accessToken), cache: "no-store" });
    const payload = (await response.json()) as { name?: string; commit?: { id?: string }; can_push?: boolean };
    if (!response.ok || !payload.name || !payload.commit?.id) throw new Error("GitLab branch could not be reloaded before saving.");
    return { name: payload.name, commit: payload.commit.id, canPush: payload.can_push };
  }

  private headers(accessToken: string) {
    return { authorization: `Bearer ${accessToken}` };
  }
}
