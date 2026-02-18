import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';

const files = sqliteTable("files", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date())
});
const insertFileSchema = createInsertSchema(files).omit({
  id: true,
  createdAt: true
});
const api = {
  files: {
    list: {
      method: "GET",
      path: "/api/files",
      responses: {
        200: z.array(z.custom())
      }
    },
    create: {
      method: "POST",
      path: "/api/files/create",
      input: insertFileSchema,
      responses: {
        201: z.custom()
      }
    },
    update: {
      method: "PUT",
      path: "/api/files/:id",
      input: insertFileSchema.partial(),
      responses: {
        200: z.custom(),
        404: z.object({ message: z.string() })
      }
    },
    delete: {
      method: "DELETE",
      path: "/api/files/:id",
      responses: {
        204: z.void(),
        404: z.object({ message: z.string() })
      }
    }
  }
};
function buildUrl(path, params) {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

const schema = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  api,
  buildUrl,
  files,
  insertFileSchema
}, Symbol.toStringTag, { value: 'Module' }));

const databaseUrl = "file:./taskManagement.db";
const dbPath = databaseUrl.replace(/^(sqlite:|file:)/, "");
const sqlite = new Database(dbPath);
const db = drizzle(sqlite, { schema });

class DatabaseStorage {
  async getFiles() {
    return await db.select().from(files).orderBy(files.id);
  }
  async getFile(id) {
    const [file] = await db.select().from(files).where(eq(files.id, id));
    return file;
  }
  async createFile(insertFile) {
    const [file] = await db.insert(files).values(insertFile).returning();
    return file;
  }
  async updateFile(id, updates) {
    const [updatedFile] = await db.update(files).set(updates).where(eq(files.id, id)).returning();
    return updatedFile;
  }
  async deleteFile(id) {
    await db.delete(files).where(eq(files.id, id));
  }
}
const storage = new DatabaseStorage();

export { DatabaseStorage as D, storage as s };
