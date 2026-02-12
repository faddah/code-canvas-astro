// Database initialization script for Docker
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { sql } from 'drizzle-orm';

const databaseUrl = process.env.DATABASE_URL || 'file:/app/data/taskManagement.db';
const dbPath = databaseUrl.replace(/^(sqlite:|file:)/, '');

console.log('Initializing database at:', dbPath);

const sqlite = new Database(dbPath);
const db = drizzle(sqlite);

// Create the files table if it doesn't exist
const createTableSQL = sql`
  CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )
`;

try {
  db.run(createTableSQL);
  console.log('✓ Database schema initialized successfully');
  process.exit(0);
} catch (error) {
  console.error('✗ Failed to initialize database:', error);
  process.exit(1);
}
