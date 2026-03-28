
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Starter files — default Python files shown to all users (read-only via API)
export const starterFiles = sqliteTable("starter_files", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  projectId: integer("project_id").references(() => projects.id),
});

// Backward-compatible alias (used by old /api/files/ routes during transition)
export const files = starterFiles;

export const insertStarterFileSchema = createInsertSchema(starterFiles).omit({
  id: true,
  createdAt: true,
});

// Keep old names for backward compatibility
export const insertFileSchema = insertStarterFileSchema;

export type StarterFile = typeof starterFiles.$inferSelect;
export type InsertStarterFile = (typeof insertStarterFileSchema)["_output"];
export type File = StarterFile;
export type InsertFile = InsertStarterFile;

// User profiles — extra profile data linked to Clerk user
export const userProfiles = sqliteTable("user_profiles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  phone: text("phone"),
  city: text("city"),
  state: text("state"),
  postalCode: text("postal_code"),
  country: text("country"),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  createdAt: true,
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = (typeof insertUserProfileSchema)["_output"];

// Projects — groups of files owned by authenticated users
export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clerkUserId: text("clerk_user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = (typeof insertProjectSchema)["_output"];

// User files — files owned by authenticated users
export const userFiles = sqliteTable("user_files", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clerkUserId: text("clerk_user_id").notNull(),
  projectId: integer("project_id"),
  name: text("name").notNull(),
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const insertUserFileSchema = createInsertSchema(userFiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UserFile = typeof userFiles.$inferSelect;
export type InsertUserFile = (typeof insertUserFileSchema)["_output"];

export const api = {
  // Legacy files endpoints (backward compat, points to starter_files)
  files: {
    list: {
      method: 'GET' as const,
      path: '/api/files',
      responses: {
        200: z.array(z.custom<StarterFile>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/files/create',
      input: insertStarterFileSchema,
      responses: {
        201: z.custom<StarterFile>(),
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/files/:id',
      input: insertStarterFileSchema.partial(),
      responses: {
        200: z.custom<StarterFile>(),
        404: z.object({ message: z.string() }),
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/files/:id',
      responses: {
        204: z.void(),
        404: z.object({ message: z.string() }),
      },
    },
  },
  // Starter files (read-only)
  starterFiles: {
    list: {
      method: 'GET' as const,
      path: '/api/starter-files',
    },
  },
  // User files (auth-required)
  userFiles: {
    list: {
      method: 'GET' as const,
      path: '/api/user-files',
    },
    create: {
      method: 'POST' as const,
      path: '/api/user-files/create',
    },
    update: {
      method: 'PUT' as const,
      path: '/api/user-files/:id',
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/user-files/:id',
    },
  },
  // Projects (auth-required)
  projects: {
    list: {
      method: 'GET' as const,
      path: '/api/projects',
    },
    get: {
      method: 'GET' as const,
      path: '/api/projects/:id',
    },
    create: {
      method: 'POST' as const,
      path: '/api/projects/create',
    },
    update: {
      method: 'PUT' as const,
      path: '/api/projects/:id',
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/projects/:id',
    },
  },
  // User profile (auth-required)
  userProfile: {
    get: {
      method: 'GET' as const,
      path: '/api/user-profile',
    },
    create: {
      method: 'POST' as const,
      path: '/api/user-profile',
    },
    update: {
      method: 'PUT' as const,
      path: '/api/user-profile',
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/user-profile',
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
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
