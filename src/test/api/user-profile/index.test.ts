import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    createMockAPIContext,
    createAuthContext,
    createInvalidJsonRequest,
} from "../../helpers/mock-api-context";
import { expectJson } from "../../helpers/response-helpers";
import { expectNoContent } from "../../helpers/response-helpers";

const mockStorage = vi.hoisted(() => ({
    getFiles: vi.fn(),
    getFile: vi.fn(),
    createFile: vi.fn(),
    updateFile: vi.fn(),
    deleteFile: vi.fn(),
    getStarterFiles: vi.fn(),
    getStarterFile: vi.fn(),
    getUserFiles: vi.fn(),
    getUserFile: vi.fn(),
    createUserFile: vi.fn(),
    updateUserFile: vi.fn(),
    deleteUserFile: vi.fn(),
    getUserProfile: vi.fn(),
    createUserProfile: vi.fn(),
    updateUserProfile: vi.fn(),
    deleteUserProfile: vi.fn(),
    getProjects: vi.fn(),
    getProject: vi.fn(),
    createProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
    getProjectFiles: vi.fn(),
    deleteAllUserFiles: vi.fn(),
    deleteAllProjectFiles: vi.fn(),
    getProjectPackages: vi.fn(),
    getAllUserPackages: vi.fn(),
    addProjectPackage: vi.fn(),
    removeProjectPackage: vi.fn(),
    removeAllProjectPackages: vi.fn(),
}));

vi.mock("@/lib/db/storage", () => ({
    DatabaseStorage: class {
        constructor() {
        return mockStorage;
        }
    },
}));

import { GET, POST, PUT, DELETE } from "@/pages/api/user-profile/index";

beforeEach(() => {
    vi.clearAllMocks();
});

// ─── GET ───

describe("GET /api/user-profile", () => {
    it("returns 401 when not authenticated", async () => {
        const ctx = createMockAPIContext();
        const res = await GET(ctx);
        await expectJson(res, 401, { error: "Unauthorized" });
        expect(mockStorage.getUserProfile).not.toHaveBeenCalled();
    });

    it("returns profile when found", async () => {
        const profile = { id: 1, clerkUserId: "user_123", displayName: "Ada" };
        mockStorage.getUserProfile.mockResolvedValue(profile);

        const ctx = createAuthContext("user_123");
        const res = await GET(ctx);
        await expectJson(res, 200, { id: 1, displayName: "Ada" });
        expect(mockStorage.getUserProfile).toHaveBeenCalledWith("user_123");
    });

    it("returns 404 when profile not found", async () => {
        mockStorage.getUserProfile.mockResolvedValue(undefined);

        const ctx = createAuthContext("user_123");
        const res = await GET(ctx);
        await expectJson(res, 404, { message: "Profile not found" });
    });
});

// ─── POST ───

describe("POST /api/user-profile", () => {
    it("returns 401 when not authenticated", async () => {
        const ctx = createMockAPIContext({
        method: "POST",
        body: { displayName: "Ada" },
        });
        const res = await POST(ctx);
        await expectJson(res, 401, { error: "Unauthorized" });
        expect(mockStorage.createUserProfile).not.toHaveBeenCalled();
    });

    it("creates profile and returns 201", async () => {
        const body = { displayName: "Ada" };
        const created = { id: 1, ...body, clerkUserId: "user_123" };
        mockStorage.getUserProfile.mockResolvedValue(undefined);
        mockStorage.createUserProfile.mockResolvedValue(created);

        const ctx = createAuthContext("user_123", {
        method: "POST",
        body,
        });
        const res = await POST(ctx);
        await expectJson(res, 201, { id: 1, displayName: "Ada" });
        expect(mockStorage.createUserProfile).toHaveBeenCalledWith({
        displayName: "Ada",
        clerkUserId: "user_123",
        });
    });

    it("returns existing profile (200) if one already exists", async () => {
        const existing = { id: 1, clerkUserId: "user_123", displayName: "Ada" };
        mockStorage.getUserProfile.mockResolvedValue(existing);

        const ctx = createAuthContext("user_123", {
        method: "POST",
        body: { displayName: "Ada" },
        });
        const res = await POST(ctx);
        await expectJson(res, 200, { id: 1, displayName: "Ada" });
        expect(mockStorage.createUserProfile).not.toHaveBeenCalled();
    });

    it("returns 400 on invalid JSON body", async () => {
        const ctx = createAuthContext("user_123");
        ctx.request = createInvalidJsonRequest("POST");

        const res = await POST(ctx);
        await expectJson(res, 400, { message: "Invalid JSON" });
    });

    it("handles UNIQUE constraint race — returns existing profile", async () => {
        const raceProfile = { id: 1, clerkUserId: "user_123", displayName: "Ada" };
        mockStorage.getUserProfile
        .mockResolvedValueOnce(undefined) // first check: no profile
        .mockResolvedValueOnce(raceProfile); // after race: profile exists
        mockStorage.createUserProfile.mockRejectedValue(
        new Error("UNIQUE constraint failed"),
        );

        const ctx = createAuthContext("user_123", {
        method: "POST",
        body: { displayName: "Ada" },
        });
        const res = await POST(ctx);
        await expectJson(res, 200, { id: 1, displayName: "Ada" });
    });

    it("returns 400 when create fails and no race profile found", async () => {
        mockStorage.getUserProfile.mockResolvedValue(undefined);
        mockStorage.createUserProfile.mockRejectedValue(new Error("DB constraint"));

        const ctx = createAuthContext("user_123", {
        method: "POST",
        body: { displayName: "" },
        });
        const res = await POST(ctx);
        await expectJson(res, 400, { message: "Invalid input" });
    });
});

// ─── PUT ───

describe("PUT /api/user-profile", () => {
    it("returns 401 when not authenticated", async () => {
        const ctx = createMockAPIContext({
        method: "PUT",
        body: { displayName: "Updated" },
        });
        const res = await PUT(ctx);
        await expectJson(res, 401, { error: "Unauthorized" });
        expect(mockStorage.updateUserProfile).not.toHaveBeenCalled();
    });

    it("updates profile and returns 200", async () => {
        const updated = { id: 1, clerkUserId: "user_123", displayName: "Updated" };
        mockStorage.updateUserProfile.mockResolvedValue(updated);

        const ctx = createAuthContext("user_123", {
        method: "PUT",
        body: { displayName: "Updated" },
        });
        const res = await PUT(ctx);
        await expectJson(res, 200, { displayName: "Updated" });
        expect(mockStorage.updateUserProfile).toHaveBeenCalledWith("user_123", {
        displayName: "Updated",
        });
    });

    it("returns 404 when profile not found", async () => {
        mockStorage.updateUserProfile.mockResolvedValue(undefined);

        const ctx = createAuthContext("user_123", {
        method: "PUT",
        body: { displayName: "Updated" },
        });
        const res = await PUT(ctx);
        await expectJson(res, 404, { message: "Profile not found" });
    });

    it("returns 400 on invalid JSON body", async () => {
        const ctx = createAuthContext("user_123");
        ctx.request = createInvalidJsonRequest("PUT");

    const res = await PUT(ctx);
    await expectJson(res, 400, { message: "Invalid input" });
  });
});

// ─── DELETE ───

describe("DELETE /api/user-profile", () => {
    it("returns 401 when not authenticated", async () => {
        const ctx = createMockAPIContext();
        const res = await DELETE(ctx);
        await expectJson(res, 401, { error: "Unauthorized" });
        expect(mockStorage.deleteUserProfile).not.toHaveBeenCalled();
    });

    it("cascade-deletes user files then profile, returns 204", async () => {
        mockStorage.deleteAllUserFiles.mockResolvedValue(undefined);
        mockStorage.deleteUserProfile.mockResolvedValue(undefined);

        const ctx = createAuthContext("user_123");
        const res = await DELETE(ctx);
        expectNoContent(res);
        expect(mockStorage.deleteAllUserFiles).toHaveBeenCalledWith("user_123");
        expect(mockStorage.deleteUserProfile).toHaveBeenCalledWith("user_123");
    });

    it("returns 500 on database error", async () => {
        const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        mockStorage.deleteAllUserFiles.mockRejectedValue(new Error("DB down"));

        const ctx = createAuthContext("user_123");
        const res = await DELETE(ctx);
        await expectJson(res, 500, { message: "Failed to delete profile" });
        errSpy.mockRestore();
    });
});
