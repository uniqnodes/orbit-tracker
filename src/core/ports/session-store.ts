import type { ConnectedAccount, ProviderId } from "@/core/domain/provider";

export type ProviderSession = {
  account: ConnectedAccount;
  token: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: string;
  };
};

export type CreateSession = {
  provider: ProviderId;
  login: string;
  displayName: string | null;
  token: ProviderSession["token"];
};

export interface SessionStore {
  create(input: CreateSession): Promise<string>;
  get(id?: string): Promise<ProviderSession | null>;
  delete(id?: string): Promise<void>;
}
