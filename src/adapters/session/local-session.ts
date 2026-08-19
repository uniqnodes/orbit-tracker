import type { ConnectedAccount, ProviderId } from "@/core/domain/provider";
import { randomBytes } from "node:crypto";

export const sessionCookieName = "orbit_session";

export type LocalSession = {
  account: ConnectedAccount;
  token: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: string;
  };
};

const sessions = new Map<string, LocalSession>();

export function createSession(input: {
  provider: ProviderId;
  login: string;
  displayName: string | null;
  token: LocalSession["token"];
}) {
  const session: LocalSession = {
    account: {
      provider: input.provider,
      login: input.login,
      displayName: input.displayName,
      connectedAt: new Date().toISOString(),
    },
    token: input.token,
  };
  const id = randomBytes(32).toString("base64url");
  sessions.set(id, session);
  return id;
}

export function getSession(id?: string) {
  return id ? sessions.get(id) ?? null : null;
}

export function deleteSession(id?: string) {
  if (id) sessions.delete(id);
}
