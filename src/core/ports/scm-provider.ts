import type { ConnectedAccount, ProviderId } from "@/core/domain/provider";

export type ProviderAuthorization = {
  authorizationUrl: string;
  transaction: {
    state: string;
    codeVerifier?: string;
  };
};

export type ProviderToken = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
};

export interface ScmProvider {
  readonly id: ProviderId;
  beginAuthorization(): ProviderAuthorization;
  exchangeAuthorizationCode(input: {
    code: string;
    codeVerifier?: string;
  }): Promise<ProviderToken>;
  getConnectedAccount(accessToken: string): Promise<ConnectedAccount>;
}
