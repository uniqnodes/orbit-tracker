import { PostgresSessionStore } from "./postgres-session-store";

export const sessionCookieName = "orbit_session";

const postgresStore = new PostgresSessionStore();

export function sessionStore() {
  if (process.env.DATABASE_URL?.trim()) return postgresStore;
  throw new Error("DATABASE_URL is required for provider sessions.");
}
