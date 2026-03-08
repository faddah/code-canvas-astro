import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "../../shared/schema";

// Prefer runtime process.env.DATABASE_URL (set by Lambda handler) over
// import.meta.env.DATABASE_URL which Vite bakes at build time from .env.
// In Lambda, the handler sets DATABASE_URL=file:/tmp/taskManagement.db at
// runtime — the build-time value (file:./taskManagement.db) would be wrong.
const databaseUrl = process.env.DATABASE_URL || import.meta.env?.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Extract the file path from the DATABASE_URL (removes "sqlite:" or "file:" prefix if present)
const dbPath = databaseUrl.replace(/^(sqlite:|file:)/, "");

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("busy_timeout = 5000");
export const db = drizzle(sqlite, { schema });
