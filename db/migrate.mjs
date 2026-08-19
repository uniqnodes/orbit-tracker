import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) throw new Error("DATABASE_URL is required to run migrations.");

const migrationsDirectory = join(import.meta.dirname, "migrations");
const migrations = (await readdir(migrationsDirectory)).filter((file) => file.endsWith(".sql")).sort();
const client = new pg.Client({ connectionString: databaseUrl });

await client.connect();
try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS orbit_schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  for (const migration of migrations) {
    const applied = await client.query("SELECT 1 FROM orbit_schema_migrations WHERE name = $1", [migration]);
    if (applied.rowCount) continue;
    await client.query("BEGIN");
    try {
      await client.query(await readFile(join(migrationsDirectory, migration), "utf8"));
      await client.query("INSERT INTO orbit_schema_migrations (name) VALUES ($1)", [migration]);
      await client.query("COMMIT");
      console.log(`Applied ${migration}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
} finally {
  await client.end();
}
