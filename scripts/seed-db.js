// Database seeding script with initial data
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { sql } from 'drizzle-orm';

const databaseUrl = process.env.DATABASE_URL || 'file:/app/data/taskManagement.db';
const dbPath = databaseUrl.replace(/^(sqlite:|file:)/, '');

console.log('Seeding database at:', dbPath);

const sqlite = new Database(dbPath);
const db = drizzle(sqlite);

// Initial seed data from production database
const seedData = [
  {
    id: 1,
    name: 'main.py',
    content: `import sys
import utils

# This is the main entry point
print("Hello from Python!")
print("<h1>This is HTML output</h1>")

print(utils.greet("Faddah"))

render(f'<h1 style="text-align: center;">{utils.greet("Faddah")}</h1>')


# Example of using the 'js' module to interact with the DOM directly
# (This works in Pyodide!)
# js.document.title = "Updated from Python"
                `,
    created_at: 1770857054
  },
  {
    id: 2,
    name: 'utils.py',
    content: `def greet(name):
                        return f"Hello, {name}!"
                    `,
    created_at: 1770857054
  }
];

try {
  // Check if data already exists
  const countResult = db.get(sql`SELECT COUNT(*) as count FROM files`);

  if (countResult && countResult.count > 0) {
    console.log(`✓ Database already has ${countResult.count} records, skipping seed`);
    process.exit(0);
  }

  // Insert seed data
  console.log('Inserting seed data...');

  for (const record of seedData) {
    db.run(sql`
      INSERT INTO files (id, name, content, created_at)
      VALUES (${record.id}, ${record.name}, ${record.content}, ${record.created_at})
    `);
  }

  console.log(`✓ Successfully seeded ${seedData.length} records`);
  process.exit(0);
} catch (error) {
  console.error('✗ Failed to seed database:', error);
  process.exit(1);
}
