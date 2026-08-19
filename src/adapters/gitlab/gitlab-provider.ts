import { randomBytes, createHash } from "node:crypto";
import { callbackUrl, gitlabBaseUrl, providerCredentials } from "@/adapters/config/provider-config";
import type { ConnectedAccount } from "@/core/domain/provider";
import type { BranchReference, ProviderAuthorization, ProviderToken, ScmProvider } from "@/core/ports/scm-provider";

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
    const payload = (await response.json()) as Array<{ name?: string; commit?: { id?: string } }>;
    if (!response.ok) throw new Error("GitLab branches could not be loaded.");
    return payload.flatMap((branch) => branch.name && branch.commit?.id ? [{ name: branch.name, commit: branch.commit.id }] : []);
  }

  async readFile(accessToken: string, project: string, branch: string, path: string) {
    const url = new URL(`${gitlabBaseUrl()}/api/v4/projects/${encodeURIComponent(project)}/repository/files/${encodeURIComponent(path)}/raw`);
    url.searchParams.set("ref", branch);
    const response = await fetch(url, { headers: this.headers(accessToken), cache: "no-store" });
    if (!response.ok) throw new Error(`GitLab file could not be loaded: ${path}`);
    return response.text();
  }

  private headers(accessToken: string) {
    return { authorization: `Bearer ${accessToken}` };
  }
}
