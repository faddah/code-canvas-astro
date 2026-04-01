import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "@shared/schema";

/**
 * Creates an in-memory SQLite database via @libsql/client for testing.
 * Tables are created from the schema — no migration files needed.
 */
export function createTestDb() {
  const client = createClient({ url: ":memory:" });
  const db = drizzle(client, { schema });
  return { client, db };
}

/**
 * Creates all tables in the test database.
 * Call this in beforeEach() to get a fresh schema.
 */
export async function setupTestTables(client: ReturnType<typeof createClient>) {
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clerk_user_id TEXT NOT NULL UNIQUE,
      phone TEXT,
      city TEXT,
      state TEXT,
      postal_code TEXT,
      country TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clerk_user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS starter_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      project_id INTEGER REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS user_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clerk_user_id TEXT NOT NULL,
      project_id INTEGER REFERENCES projects(id),
      name TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS project_packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clerk_user_id TEXT NOT NULL,
      project_id INTEGER REFERENCES projects(id),
      package_name TEXT NOT NULL,
      version_spec TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);
}

/**
 * Drops all tables. Call in afterEach() for isolation.
 */
export async function teardownTestTables(client: ReturnType<typeof createClient>) {
  await client.executeMultiple(`
    DROP TABLE IF EXISTS project_packages;
    DROP TABLE IF EXISTS user_files;
    DROP TABLE IF EXISTS starter_files;
    DROP TABLE IF EXISTS projects;
    DROP TABLE IF EXISTS user_profiles;
  `);
}
