// Database initialization script for Docker
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { sql } from 'drizzle-orm';

const databaseUrl = process.env.DATABASE_URL || 'file:/app/data/taskManagement.db';
const dbPath = databaseUrl.replace(/^(sqlite:|file:)/, '');

console.warn('Initializing database at:', dbPath);

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('busy_timeout = 5000');
const db = drizzle(sqlite);

try {
  // Migration: rename old 'files' table to 'starter_files' if needed
  const tablesResult = db.all(sql`SELECT name FROM sqlite_master WHERE type='table'`);
  const tableNames = tablesResult.map(r => r.name);

  if (tableNames.includes('files') && !tableNames.includes('starter_files')) {
    console.warn('Migrating: renaming "files" table to "starter_files"...');
    db.run(sql`ALTER TABLE files RENAME TO starter_files`);
    console.warn('✓ Renamed "files" to "starter_files"');
  }

  // Create the starter_files table if it doesn't exist
  db.run(sql`
    CREATE TABLE IF NOT EXISTS starter_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);
  console.warn('✓ starter_files table ready');

  // Create the user_profiles table
  db.run(sql`
    CREATE TABLE IF NOT EXISTS user_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clerk_user_id TEXT NOT NULL UNIQUE,
      phone TEXT,
      city TEXT,
      state TEXT,
      postal_code TEXT,
      country TEXT,
      created_at INTEGER NOT NULL
    )
  `);
  console.warn('✓ user_profiles table ready');

  // Create the user_files table
  db.run(sql`
    CREATE TABLE IF NOT EXISTS user_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clerk_user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);
  console.warn('✓ user_files table ready');

  // Create indexes for faster lookups
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_user_files_clerk_user_id ON user_files(clerk_user_id)`);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_user_profiles_clerk_user_id ON user_profiles(clerk_user_id)`);
  console.warn('✓ Indexes created');

  console.warn('✓ Database schema initialized successfully');
  process.exit(0);
} catch (error) {
  console.error('✗ Failed to initialize database:', error);
  process.exit(1);
}
