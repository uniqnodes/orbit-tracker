export const providerIds = ["gitlab", "github"] as const;

export type ProviderId = (typeof providerIds)[number];

export type ConnectedAccount = {
  provider: ProviderId;
  login: string;
  displayName: string | null;
  connectedAt: string;
};

export function isProviderId(value: string): value is ProviderId {
  return providerIds.includes(value as ProviderId);
}

export function providerLabel(provider: ProviderId) {
  return provider === "gitlab" ? "GitLab" : "GitHub";
}

export class BranchChangedError extends Error {
  constructor() {
    super("The selected branch changed after it was loaded. Reload before saving.");
  }
}
