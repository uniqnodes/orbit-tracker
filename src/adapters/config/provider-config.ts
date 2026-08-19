import type { ProviderId } from "@/core/domain/provider";

type ProviderCredentials = {
  clientId: string;
  clientSecret: string;
};

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}

export function appUrl() {
  const value = required("ORBIT_APP_URL");
  return new URL(value).origin;
}

export function sessionSecret() {
  return required("ORBIT_SESSION_SECRET");
}

export function tokenEncryptionSecret() {
  return required("ORBIT_TOKEN_ENCRYPTION_SECRET");
}

export function providerCredentials(provider: ProviderId): ProviderCredentials {
  if (provider === "gitlab") {
    return {
      clientId: required("ORBIT_GITLAB_CLIENT_ID"),
      clientSecret: required("ORBIT_GITLAB_CLIENT_SECRET"),
    };
  }

  return {
    clientId: required("ORBIT_GITHUB_APP_CLIENT_ID"),
    clientSecret: required("ORBIT_GITHUB_APP_CLIENT_SECRET"),
  };
}

export function gitlabBaseUrl() {
  return new URL(required("ORBIT_GITLAB_BASE_URL")).origin;
}

export function callbackUrl(provider: ProviderId) {
  return `${appUrl()}/api/connect/${provider}/callback`;
}
