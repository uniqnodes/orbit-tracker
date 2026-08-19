import type { CreateSession, ProviderSession, SessionStore } from "@/core/ports/session-store";
import { randomBytes } from "node:crypto";

export class LocalSessionStore implements SessionStore {
  private readonly sessions = new Map<string, ProviderSession>();

  async create(input: CreateSession) {
    const id = randomBytes(32).toString("base64url");
    this.sessions.set(id, {
      account: {
        provider: input.provider,
        login: input.login,
        displayName: input.displayName,
        connectedAt: new Date().toISOString(),
      },
      token: input.token,
    });
    return id;
  }

  async get(id?: string) {
    return id ? this.sessions.get(id) ?? null : null;
  }

  async delete(id?: string) {
    if (id) this.sessions.delete(id);
  }
}
