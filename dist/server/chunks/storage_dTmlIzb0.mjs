import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { eq, and } from "drizzle-orm";
const starterFiles = sqliteTable("starter_files", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date())
});
const files = starterFiles;
const insertStarterFileSchema = createInsertSchema(starterFiles).omit({
  id: true,
  createdAt: true
});
const insertFileSchema = insertStarterFileSchema;
const userProfiles = sqliteTable("user_profiles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  phone: text("phone"),
  city: text("city"),
  state: text("state"),
  postalCode: text("postal_code"),
  country: text("country"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date())
});
const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  createdAt: true
});
const userFiles = sqliteTable("user_files", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clerkUserId: text("clerk_user_id").notNull(),
  name: text("name").notNull(),
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date())
});
const insertUserFileSchema = createInsertSchema(userFiles).omit({
  id: true,
  createdAt: true
});
const api = {
  // Legacy files endpoints (backward compat, points to starter_files)
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
      input: insertStarterFileSchema,
      responses: {
        201: z.custom()
      }
    },
    update: {
      method: "PUT",
      path: "/api/files/:id",
      input: insertStarterFileSchema.partial(),
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
  },
  // Starter files (read-only)
  starterFiles: {
    list: {
      method: "GET",
      path: "/api/starter-files"
    }
  },
  // User files (auth-required)
  userFiles: {
    list: {
      method: "GET",
      path: "/api/user-files"
    },
    create: {
      method: "POST",
      path: "/api/user-files/create"
    },
    update: {
      method: "PUT",
      path: "/api/user-files/:id"
    },
    delete: {
      method: "DELETE",
      path: "/api/user-files/:id"
    }
  },
  // User profile (auth-required)
  userProfile: {
    get: {
      method: "GET",
      path: "/api/user-profile"
    },
    create: {
      method: "POST",
      path: "/api/user-profile"
    },
    update: {
      method: "PUT",
      path: "/api/user-profile"
    },
    delete: {
      method: "DELETE",
      path: "/api/user-profile"
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
const schema = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  api,
  buildUrl,
  files,
  insertFileSchema,
  insertStarterFileSchema,
  insertUserFileSchema,
  insertUserProfileSchema,
  starterFiles,
  userFiles,
  userProfiles
}, Symbol.toStringTag, { value: "Module" }));
const tursoUrl = process.env.TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;
if (!tursoUrl) {
  throw new Error(
    "TURSO_DATABASE_URL must be set. Did you forget to configure Turso?"
  );
}
if (!tursoToken) {
  throw new Error(
    "TURSO_AUTH_TOKEN must be set. Did you forget to configure Turso?"
  );
}
const client = createClient({
  url: tursoUrl,
  authToken: tursoToken
});
const db = drizzle(client, { schema });
class DatabaseStorage {
  // Legacy methods (backward compat — operate on starter_files)
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
  // Starter files (read-only)
  async getStarterFiles() {
    return await db.select().from(starterFiles).orderBy(starterFiles.id);
  }
  async getStarterFile(id) {
    const [file] = await db.select().from(starterFiles).where(eq(starterFiles.id, id));
    return file;
  }
  // User files (always scoped by clerkUserId for security)
  async getUserFiles(clerkUserId) {
    return await db.select().from(userFiles).where(eq(userFiles.clerkUserId, clerkUserId)).orderBy(userFiles.id);
  }
  async getUserFile(id, clerkUserId) {
    const [file] = await db.select().from(userFiles).where(and(eq(userFiles.id, id), eq(userFiles.clerkUserId, clerkUserId)));
    return file;
  }
  async createUserFile(insertFile) {
    const [file] = await db.insert(userFiles).values(insertFile).returning();
    return file;
  }
  async updateUserFile(id, clerkUserId, updates) {
    const [updatedFile] = await db.update(userFiles).set(updates).where(and(eq(userFiles.id, id), eq(userFiles.clerkUserId, clerkUserId))).returning();
    return updatedFile;
  }
  async deleteUserFile(id, clerkUserId) {
    await db.delete(userFiles).where(and(eq(userFiles.id, id), eq(userFiles.clerkUserId, clerkUserId)));
  }
  // User profiles
  async getUserProfile(clerkUserId) {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.clerkUserId, clerkUserId));
    return profile;
  }
  async createUserProfile(profile) {
    const [created] = await db.insert(userProfiles).values(profile).returning();
    return created;
  }
  async updateUserProfile(clerkUserId, updates) {
    const [updated] = await db.update(userProfiles).set(updates).where(eq(userProfiles.clerkUserId, clerkUserId)).returning();
    return updated;
  }
  async deleteUserProfile(clerkUserId) {
    await db.delete(userProfiles).where(eq(userProfiles.clerkUserId, clerkUserId));
  }
  async deleteAllUserFiles(clerkUserId) {
    await db.delete(userFiles).where(eq(userFiles.clerkUserId, clerkUserId));
  }
}
const storage = new DatabaseStorage();
export {
  DatabaseStorage as D,
  storage as s
};
