import { defineConfig } from "drizzle-kit";

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  throw new Error("TURSO_DATABASE_URL and / or TURSO_AUTH_TOKEN must be set");
}

export default defineConfig({
  out: "./migrations",
  schema: "./src/shared/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
