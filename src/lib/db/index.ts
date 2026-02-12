import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "../../shared/schema";

// In Astro, use import.meta.env instead of process.env
// Fallback to process.env for compatibility with build scripts
const databaseUrl = import.meta.env?.DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Extract the file path from the DATABASE_URL (removes "sqlite:" or "file:" prefix if present)
const dbPath = databaseUrl.replace(/^(sqlite:|file:)/, "");

const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });
