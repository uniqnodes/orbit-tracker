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

export type BranchReference = { name: string; commit: string; canPush?: boolean };

export type WriteFileInput = {
  project: string;
  branch: string;
  path: string;
  content: string;
  expectedBranchCommit: string;
  message: string;
};

export type WriteFilesInput = Omit<WriteFileInput, "path" | "content"> & {
  files: Array<{ path: string; content: string }>;
};

export interface ScmProvider {
  readonly id: ProviderId;
  beginAuthorization(): ProviderAuthorization;
  exchangeAuthorizationCode(input: {
    code: string;
    codeVerifier?: string;
  }): Promise<ProviderToken>;
  getConnectedAccount(accessToken: string): Promise<ConnectedAccount>;
  listBranches(accessToken: string, project: string): Promise<BranchReference[]>;
  readFile(accessToken: string, project: string, branch: string, path: string): Promise<string>;
  writeFile(accessToken: string, input: WriteFileInput): Promise<BranchReference>;
  writeFiles(accessToken: string, input: WriteFilesInput): Promise<BranchReference>;
}
