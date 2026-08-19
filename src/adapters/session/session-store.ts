import { PostgresSessionStore } from "./postgres-session-store";
import { LocalSessionStore } from "./local-session";

export const sessionCookieName = "orbit_session";

const localStore = new LocalSessionStore();
const postgresStore = new PostgresSessionStore();

export function sessionStore() {
  if (process.env.DATABASE_URL?.trim()) return postgresStore;
  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL is required for production sessions.");
  }
  return localStore;
}
