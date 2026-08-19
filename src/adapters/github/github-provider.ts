import { randomBytes } from "node:crypto";
import { callbackUrl, providerCredentials } from "@/adapters/config/provider-config";
import type { ConnectedAccount } from "@/core/domain/provider";
import type { ProviderAuthorization, ProviderToken, ScmProvider } from "@/core/ports/scm-provider";

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
}
