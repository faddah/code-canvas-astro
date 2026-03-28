import { describe, it, expect } from "vitest";
import {
  buildUrl,
  api,
  insertStarterFileSchema,
  insertUserFileSchema,
  insertUserProfileSchema,
  insertProjectSchema,
} from "@shared/schema";

// ─── buildUrl ───

describe("buildUrl", () => {
  it("replaces a single :param with its value", () => {
    expect(buildUrl("/api/files/:id", { id: 42 })).toBe("/api/files/42");
  });

  it("replaces multiple :params", () => {
    expect(buildUrl("/api/:type/:id", { type: "files", id: 7 })).toBe(
      "/api/files/7"
    );
  });

  it("returns path unchanged when no params provided", () => {
    expect(buildUrl("/api/files")).toBe("/api/files");
  });

  it("returns path unchanged when params object is empty", () => {
    expect(buildUrl("/api/files/:id", {})).toBe("/api/files/:id");
  });

  it("handles string param values", () => {
    expect(buildUrl("/api/users/:userId", { userId: "user_abc" })).toBe(
      "/api/users/user_abc"
    );
  });

  it("ignores params not present in the path", () => {
    expect(buildUrl("/api/files/:id", { id: 1, extra: "ignored" })).toBe(
      "/api/files/1"
    );
  });
});

// ─── Zod Schemas ───

describe("insertStarterFileSchema", () => {
  it("accepts valid input", () => {
    const result = insertStarterFileSchema.safeParse({
      name: "hello.py",
      content: 'print("hello")',
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = insertStarterFileSchema.safeParse({
      content: 'print("hello")',
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing content", () => {
    const result = insertStarterFileSchema.safeParse({
      name: "hello.py",
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional projectId", () => {
    const result = insertStarterFileSchema.safeParse({
      name: "hello.py",
      content: 'print("hello")',
      projectId: 1,
    });
    expect(result.success).toBe(true);
  });

  it("accepts input without projectId (defaults to null)", () => {
    const result = insertStarterFileSchema.safeParse({
      name: "hello.py",
      content: 'print("hello")',
    });
    expect(result.success).toBe(true);
  });
});

describe("insertUserFileSchema", () => {
  it("accepts valid input with clerkUserId", () => {
    const result = insertUserFileSchema.safeParse({
      clerkUserId: "user_abc",
      name: "script.py",
      content: "# code",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing clerkUserId", () => {
    const result = insertUserFileSchema.safeParse({
      name: "script.py",
      content: "# code",
    });
    expect(result.success).toBe(false);
  });
});

describe("insertUserProfileSchema", () => {
  it("accepts valid input with all optional fields", () => {
    const result = insertUserProfileSchema.safeParse({
      clerkUserId: "user_abc",
      phone: "503-555-1234",
      city: "Portland",
      state: "OR",
      postalCode: "97201",
      country: "US",
    });
    expect(result.success).toBe(true);
  });

  it("accepts input with only required clerkUserId", () => {
    const result = insertUserProfileSchema.safeParse({
      clerkUserId: "user_abc",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing clerkUserId", () => {
    const result = insertUserProfileSchema.safeParse({
      phone: "503-555-1234",
    });
    expect(result.success).toBe(false);
  });
});

describe("insertProjectSchema", () => {
  it("accepts valid input with name and description", () => {
    const result = insertProjectSchema.safeParse({
      clerkUserId: "user_abc",
      name: "My Python Project",
      description: "A collection of Python scripts",
    });
    expect(result.success).toBe(true);
  });

  it("accepts input with only required fields (description is optional)", () => {
    const result = insertProjectSchema.safeParse({
      clerkUserId: "user_abc",
      name: "My Project",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing clerkUserId", () => {
    const result = insertProjectSchema.safeParse({
      name: "My Project",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing name", () => {
    const result = insertProjectSchema.safeParse({
      clerkUserId: "user_abc",
    });
    expect(result.success).toBe(false);
  });
});

describe("insertUserFileSchema with projectId", () => {
  it("accepts valid input with optional projectId", () => {
    const result = insertUserFileSchema.safeParse({
      clerkUserId: "user_abc",
      name: "script.py",
      content: "# code",
      projectId: 1,
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid input without projectId (standalone file)", () => {
    const result = insertUserFileSchema.safeParse({
      clerkUserId: "user_abc",
      name: "script.py",
      content: "# code",
    });
    expect(result.success).toBe(true);
  });
});

// ─── API Endpoint Definitions ───

describe("api endpoint definitions", () => {
  it("has correct paths for user file endpoints", () => {
    expect(api.userFiles.list.path).toBe("/api/user-files");
    expect(api.userFiles.create.path).toBe("/api/user-files/create");
    expect(api.userFiles.update.path).toBe("/api/user-files/:id");
    expect(api.userFiles.delete.path).toBe("/api/user-files/:id");
  });

  it("has correct paths for user profile endpoints", () => {
    expect(api.userProfile.get.path).toBe("/api/user-profile");
    expect(api.userProfile.create.path).toBe("/api/user-profile");
    expect(api.userProfile.update.path).toBe("/api/user-profile");
    expect(api.userProfile.delete.path).toBe("/api/user-profile");
  });

  it("has correct paths for project endpoints", () => {
    expect(api.projects.list.path).toBe("/api/projects");
    expect(api.projects.get.path).toBe("/api/projects/:id");
    expect(api.projects.create.path).toBe("/api/projects/create");
    expect(api.projects.update.path).toBe("/api/projects/:id");
    expect(api.projects.delete.path).toBe("/api/projects/:id");
  });

  it("has correct HTTP methods", () => {
    expect(api.userFiles.list.method).toBe("GET");
    expect(api.userFiles.create.method).toBe("POST");
    expect(api.userFiles.update.method).toBe("PUT");
    expect(api.userFiles.delete.method).toBe("DELETE");

    expect(api.projects.list.method).toBe("GET");
    expect(api.projects.get.method).toBe("GET");
    expect(api.projects.create.method).toBe("POST");
    expect(api.projects.update.method).toBe("PUT");
    expect(api.projects.delete.method).toBe("DELETE");
  });
});
