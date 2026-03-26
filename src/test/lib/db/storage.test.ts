import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createTestDb, setupTestTables, teardownTestTables } from "../../helpers/test-db";
import type { createClient } from "@libsql/client";

// Mock the db module so DatabaseStorage uses our in-memory test DB
let testClient: ReturnType<typeof createClient>;
let testDb: ReturnType<typeof createTestDb>["db"];

vi.mock("@/lib/db/index", () => ({
  get db() {
    return testDb;
  },
}));

// Import after mock is set up
const { DatabaseStorage } = await import("@/lib/db/storage");

let storage: InstanceType<typeof DatabaseStorage>;

beforeEach(async () => {
  const created = createTestDb();
  testClient = created.client;
  testDb = created.db;
  await setupTestTables(testClient);
  storage = new DatabaseStorage();
});

afterEach(async () => {
  await teardownTestTables(testClient);
});

// ─── User Profile CRUD ───

describe("User Profile CRUD", () => {
  it("createUserProfile — persists all fields and clerkUserId matches", async () => {
    const profile = await storage.createUserProfile({
      clerkUserId: "user_abc",
      phone: "503-555-1234",
      city: "Portland",
      state: "OR",
      postalCode: "97201",
      country: "US",
    });

    expect(profile.clerkUserId).toBe("user_abc");
    expect(profile.phone).toBe("503-555-1234");
    expect(profile.city).toBe("Portland");
    expect(profile.state).toBe("OR");
    expect(profile.postalCode).toBe("97201");
    expect(profile.country).toBe("US");
    expect(profile.id).toBeDefined();
  });

  it("updateUserProfile — modifies fields, preserves unchanged fields", async () => {
    await storage.createUserProfile({
      clerkUserId: "user_abc",
      phone: "503-555-1234",
      city: "Portland",
      state: "OR",
      postalCode: "97201",
      country: "US",
    });

    const updated = await storage.updateUserProfile("user_abc", {
      city: "Seattle",
      state: "WA",
    });

    expect(updated.city).toBe("Seattle");
    expect(updated.state).toBe("WA");
    // Unchanged fields preserved
    expect(updated.phone).toBe("503-555-1234");
    expect(updated.postalCode).toBe("97201");
    expect(updated.country).toBe("US");
  });

  it("getUserProfile — reads back created profile with field equality", async () => {
    await storage.createUserProfile({
      clerkUserId: "user_abc",
      phone: "503-555-1234",
      city: "Portland",
      state: "OR",
      postalCode: "97201",
      country: "US",
    });

    const profile = await storage.getUserProfile("user_abc");

    expect(profile).toBeDefined();
    expect(profile!.clerkUserId).toBe("user_abc");
    expect(profile!.phone).toBe("503-555-1234");
    expect(profile!.city).toBe("Portland");
    expect(profile!.state).toBe("OR");
    expect(profile!.postalCode).toBe("97201");
    expect(profile!.country).toBe("US");
  });

  it("deleteUserProfile cascade — profile + all user files are deleted", async () => {
    await storage.createUserProfile({
      clerkUserId: "user_abc",
      phone: "503-555-1234",
      city: "Portland",
      state: "OR",
    });

    // Create several files for same user
    await storage.createUserFile({ clerkUserId: "user_abc", name: "a.py", content: "# a" });
    await storage.createUserFile({ clerkUserId: "user_abc", name: "b.py", content: "# b" });
    await storage.createUserFile({ clerkUserId: "user_abc", name: "c.py", content: "# c" });

    // Cascade: delete all files first, then profile
    // (mirrors the API route at src/pages/api/user-profile/index.ts)
    await storage.deleteAllUserFiles("user_abc");
    await storage.deleteUserProfile("user_abc");

    const profile = await storage.getUserProfile("user_abc");
    const files = await storage.getUserFiles("user_abc");

    expect(profile).toBeUndefined();
    expect(files).toEqual([]);
  });
});

// ─── User Files + Profile Association ───

describe("User Files + Profile Association", () => {
  it("createUserFile — returned file has correct clerkUserId", async () => {
    const file = await storage.createUserFile({
      clerkUserId: "user_abc",
      name: "hello.py",
      content: 'print("hello")',
    });

    expect(file.clerkUserId).toBe("user_abc");
    expect(file.name).toBe("hello.py");
    expect(file.content).toBe('print("hello")');
    expect(file.id).toBeDefined();
  });

  it("getUserFiles scoping — only returns files for the requested user", async () => {
    await storage.createUserFile({ clerkUserId: "user_a", name: "a1.py", content: "# a1" });
    await storage.createUserFile({ clerkUserId: "user_a", name: "a2.py", content: "# a2" });
    await storage.createUserFile({ clerkUserId: "user_b", name: "b1.py", content: "# b1" });

    const userAFiles = await storage.getUserFiles("user_a");
    const userBFiles = await storage.getUserFiles("user_b");

    expect(userAFiles).toHaveLength(2);
    expect(userAFiles.every((f) => f.clerkUserId === "user_a")).toBe(true);
    expect(userBFiles).toHaveLength(1);
    expect(userBFiles[0].clerkUserId).toBe("user_b");
  });

  it("deleteUserFile selective — only targeted file is removed", async () => {
    const f1 = await storage.createUserFile({ clerkUserId: "user_a", name: "f1.py", content: "# 1" });
    const f2 = await storage.createUserFile({ clerkUserId: "user_a", name: "f2.py", content: "# 2" });
    const f3 = await storage.createUserFile({ clerkUserId: "user_a", name: "f3.py", content: "# 3" });

    await storage.deleteUserFile(f2.id, "user_a");

    const remaining = await storage.getUserFiles("user_a");
    expect(remaining).toHaveLength(2);
    expect(remaining.map((f) => f.name)).toContain("f1.py");
    expect(remaining.map((f) => f.name)).toContain("f3.py");

    const deleted = await storage.getUserFile(f2.id, "user_a");
    expect(deleted).toBeUndefined();
  });

  it("updateUserFile round-trip — updated content matches on read-back", async () => {
    const file = await storage.createUserFile({
      clerkUserId: "user_a",
      name: "script.py",
      content: "# original",
    });

    await storage.updateUserFile(file.id, "user_a", {
      content: "# updated content",
    });

    const readBack = await storage.getUserFile(file.id, "user_a");
    expect(readBack).toBeDefined();
    expect(readBack!.content).toBe("# updated content");
    // Name should be unchanged
    expect(readBack!.name).toBe("script.py");
  });
});
