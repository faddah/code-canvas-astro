import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "../../shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Extract the file path from the DATABASE_URL (removes "sqlite:" or "file:" prefix if present)
const dbPath = process.env.DATABASE_URL.replace(/^(sqlite:|file:)/, "");

const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });
