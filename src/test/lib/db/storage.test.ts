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

// ─── Project CRUD ───

describe("Project CRUD", () => {
  it("createProject — persists name, description, and clerkUserId", async () => {
    const project = await storage.createProject({
      clerkUserId: "user_abc",
      name: "My Python Project",
      description: "A collection of scripts",
    });

    expect(project.clerkUserId).toBe("user_abc");
    expect(project.name).toBe("My Python Project");
    expect(project.description).toBe("A collection of scripts");
    expect(project.id).toBeDefined();
    expect(project.createdAt).toBeDefined();
    expect(project.updatedAt).toBeDefined();
  });

  it("createProject — description is optional (null when omitted)", async () => {
    const project = await storage.createProject({
      clerkUserId: "user_abc",
      name: "Untitled Project",
    });

    expect(project.name).toBe("Untitled Project");
    expect(project.description).toBeNull();
  });

  it("getProject — reads back created project by id + clerkUserId", async () => {
    const created = await storage.createProject({
      clerkUserId: "user_abc",
      name: "Test Project",
      description: "Testing",
    });

    const project = await storage.getProject(created.id, "user_abc");
    expect(project).toBeDefined();
    expect(project!.name).toBe("Test Project");
    expect(project!.description).toBe("Testing");
  });

  it("getProject scoping — cannot read another user's project", async () => {
    const created = await storage.createProject({
      clerkUserId: "user_a",
      name: "User A Project",
    });

    const result = await storage.getProject(created.id, "user_b");
    expect(result).toBeUndefined();
  });

  it("getProjects — returns all projects for a user, ordered by id", async () => {
    await storage.createProject({ clerkUserId: "user_a", name: "Project 1" });
    await storage.createProject({ clerkUserId: "user_a", name: "Project 2" });
    await storage.createProject({ clerkUserId: "user_b", name: "Project B" });

    const userAProjects = await storage.getProjects("user_a");
    const userBProjects = await storage.getProjects("user_b");

    expect(userAProjects).toHaveLength(2);
    expect(userAProjects[0].name).toBe("Project 1");
    expect(userAProjects[1].name).toBe("Project 2");
    expect(userBProjects).toHaveLength(1);
    expect(userBProjects[0].name).toBe("Project B");
  });

  it("updateProject — modifies name and description, preserves unchanged fields", async () => {
    const created = await storage.createProject({
      clerkUserId: "user_abc",
      name: "Original Name",
      description: "Original description",
    });

    const updated = await storage.updateProject(created.id, "user_abc", {
      name: "Updated Name",
    });

    expect(updated.name).toBe("Updated Name");
    expect(updated.description).toBe("Original description");
    expect(updated.clerkUserId).toBe("user_abc");
  });

  it("deleteProject — removes the project", async () => {
    const created = await storage.createProject({
      clerkUserId: "user_abc",
      name: "To Delete",
    });

    await storage.deleteProject(created.id, "user_abc");

    const result = await storage.getProject(created.id, "user_abc");
    expect(result).toBeUndefined();
  });

  it("deleteProject scoping — cannot delete another user's project", async () => {
    const created = await storage.createProject({
      clerkUserId: "user_a",
      name: "User A Project",
    });

    await storage.deleteProject(created.id, "user_b");

    // Should still exist
    const result = await storage.getProject(created.id, "user_a");
    expect(result).toBeDefined();
  });
});

// ─── File-Project Association ───

describe("File-Project Association", () => {
  it("createUserFile with projectId — file is associated with project", async () => {
    const project = await storage.createProject({
      clerkUserId: "user_abc",
      name: "My Project",
    });

    const file = await storage.createUserFile({
      clerkUserId: "user_abc",
      name: "main.py",
      content: "# main",
      projectId: project.id,
    });

    expect(file.projectId).toBe(project.id);
  });

  it("createUserFile without projectId — standalone file (projectId is null)", async () => {
    const file = await storage.createUserFile({
      clerkUserId: "user_abc",
      name: "standalone.py",
      content: "# standalone",
    });

    expect(file.projectId).toBeNull();
  });

  it("getProjectFiles — returns only files for the given project", async () => {
    const project1 = await storage.createProject({
      clerkUserId: "user_abc",
      name: "Project 1",
    });
    const project2 = await storage.createProject({
      clerkUserId: "user_abc",
      name: "Project 2",
    });

    await storage.createUserFile({
      clerkUserId: "user_abc",
      name: "p1_file.py",
      content: "# p1",
      projectId: project1.id,
    });
    await storage.createUserFile({
      clerkUserId: "user_abc",
      name: "p2_file.py",
      content: "# p2",
      projectId: project2.id,
    });
    await storage.createUserFile({
      clerkUserId: "user_abc",
      name: "standalone.py",
      content: "# standalone",
    });

    const p1Files = await storage.getProjectFiles(project1.id, "user_abc");
    expect(p1Files).toHaveLength(1);
    expect(p1Files[0].name).toBe("p1_file.py");

    const p2Files = await storage.getProjectFiles(project2.id, "user_abc");
    expect(p2Files).toHaveLength(1);
    expect(p2Files[0].name).toBe("p2_file.py");
  });

  it("getProjectFiles scoping — cannot read another user's project files", async () => {
    const project = await storage.createProject({
      clerkUserId: "user_a",
      name: "User A Project",
    });

    await storage.createUserFile({
      clerkUserId: "user_a",
      name: "secret.py",
      content: "# secret",
      projectId: project.id,
    });

    const result = await storage.getProjectFiles(project.id, "user_b");
    expect(result).toHaveLength(0);
  });

  it("deleteAllProjectFiles — removes all files in a project, leaves others intact", async () => {
    const project = await storage.createProject({
      clerkUserId: "user_abc",
      name: "My Project",
    });

    await storage.createUserFile({
      clerkUserId: "user_abc",
      name: "in_project.py",
      content: "# in project",
      projectId: project.id,
    });
    await storage.createUserFile({
      clerkUserId: "user_abc",
      name: "also_in_project.py",
      content: "# also in project",
      projectId: project.id,
    });
    await storage.createUserFile({
      clerkUserId: "user_abc",
      name: "standalone.py",
      content: "# standalone",
    });

    await storage.deleteAllProjectFiles(project.id, "user_abc");

    const projectFiles = await storage.getProjectFiles(project.id, "user_abc");
    expect(projectFiles).toHaveLength(0);

    const allFiles = await storage.getUserFiles("user_abc");
    expect(allFiles).toHaveLength(1);
    expect(allFiles[0].name).toBe("standalone.py");
  });
});
