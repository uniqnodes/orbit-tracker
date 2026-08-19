import { randomBytes } from "node:crypto";
import { Pool } from "pg";
import type { CreateSession, ProviderSession, SessionStore } from "@/core/ports/session-store";
import { decryptToken, encryptToken } from "./token-cipher";

const sessionLifetimeSeconds = 8 * 60 * 60;

type SessionRow = {
  provider: ProviderSession["account"]["provider"];
  login: string;
  display_name: string | null;
  connected_at: Date;
  access_token_ciphertext: string;
  refresh_token_ciphertext: string | null;
  token_expires_at: Date | null;
};

function databaseUrl() {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) throw new Error("DATABASE_URL is not configured.");
  return value;
}

let pool: Pool | undefined;

function connectionPool() {
  pool ??= new Pool({ connectionString: databaseUrl(), max: 1 });
  return pool;
}

export class PostgresSessionStore implements SessionStore {
  async create(input: CreateSession) {
    const id = randomBytes(32).toString("base64url");
    await connectionPool().query(
      `INSERT INTO orbit_sessions (
        id, provider, login, display_name, connected_at,
        access_token_ciphertext, refresh_token_ciphertext, token_expires_at, session_expires_at
      ) VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, NOW() + INTERVAL '8 hours')`,
      [
        id,
        input.provider,
        input.login,
        input.displayName,
        encryptToken(input.token.accessToken),
        input.token.refreshToken ? encryptToken(input.token.refreshToken) : null,
        input.token.expiresAt ?? null,
      ],
    );
    return id;
  }

  async get(id?: string): Promise<ProviderSession | null> {
    if (!id) return null;
    const result = await connectionPool().query<SessionRow>(
      `SELECT provider, login, display_name, connected_at, access_token_ciphertext,
              refresh_token_ciphertext, token_expires_at
       FROM orbit_sessions
       WHERE id = $1 AND session_expires_at > NOW()`,
      [id],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      account: {
        provider: row.provider,
        login: row.login,
        displayName: row.display_name,
        connectedAt: row.connected_at.toISOString(),
      },
      token: {
        accessToken: decryptToken(row.access_token_ciphertext),
        refreshToken: row.refresh_token_ciphertext ? decryptToken(row.refresh_token_ciphertext) : undefined,
        expiresAt: row.token_expires_at?.toISOString(),
      },
    };
  }

  async delete(id?: string) {
    if (id) await connectionPool().query("DELETE FROM orbit_sessions WHERE id = $1", [id]);
  }
}
