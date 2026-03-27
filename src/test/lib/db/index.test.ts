import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock drizzle-orm and @libsql/client so we don't hit a real database
vi.mock("drizzle-orm/libsql", () => ({
  drizzle: vi.fn(() => ({ __brand: "mock-drizzle-db" })),
}));

vi.mock("@libsql/client", () => ({
  createClient: vi.fn(() => ({ __brand: "mock-libsql-client" })),
}));

beforeEach(() => {
  // Reset module registry so each test gets a fresh import of index.ts
  vi.resetModules();

  // Clear env vars before each test
  delete process.env.TURSO_DATABASE_URL;
  delete process.env.TURSO_AUTH_TOKEN;
});

describe("lib/db/index", () => {
  it("throws when TURSO_DATABASE_URL is not set", async () => {
    // TURSO_AUTH_TOKEN is set but URL is missing
    process.env.TURSO_AUTH_TOKEN = "test-token";

    await expect(() => import("@/lib/db/index")).rejects.toThrow(
      "TURSO_DATABASE_URL must be set"
    );
  });

  it("throws when TURSO_AUTH_TOKEN is not set", async () => {
    // TURSO_DATABASE_URL is set but token is missing
    process.env.TURSO_DATABASE_URL = "libsql://test.turso.io";

    await expect(() => import("@/lib/db/index")).rejects.toThrow(
      "TURSO_AUTH_TOKEN must be set"
    );
  });

  it("exports db when both env vars are set", async () => {
    process.env.TURSO_DATABASE_URL = "libsql://test.turso.io";
    process.env.TURSO_AUTH_TOKEN = "test-token";

    const mod = await import("@/lib/db/index");

    expect(mod.db).toBeDefined();
    expect(mod.db).toEqual({ __brand: "mock-drizzle-db" });
  });

  it("passes url and authToken to createClient", async () => {
    process.env.TURSO_DATABASE_URL = "libsql://my-db.turso.io";
    process.env.TURSO_AUTH_TOKEN = "my-secret-token";

    await import("@/lib/db/index");

    const { createClient } = await import("@libsql/client");
    expect(createClient).toHaveBeenCalledWith({
      url: "libsql://my-db.turso.io",
      authToken: "my-secret-token",
    });
  });
});
