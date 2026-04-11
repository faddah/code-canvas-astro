import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    createMockAPIContext,
    createAuthContext,
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

import { GET, PUT, DELETE } from "@/pages/api/projects/[id]";

beforeEach(() => {
    vi.clearAllMocks();
});

// ─── GET ───

describe("GET /api/projects/:id", () => {
    it("returns 401 when not authenticated", async () => {
        const ctx = createMockAPIContext({ params: { id: "1" } });
        const res = await GET(ctx);
        await expectJson(res, 401, { error: "Unauthorized" });
        expect(mockStorage.getProject).not.toHaveBeenCalled();
    });

    it("returns project when found", async () => {
        const project = { id: 1, name: "My Project", clerkUserId: "user_123" };
        mockStorage.getProject.mockResolvedValue(project);

        const ctx = createAuthContext("user_123", { params: { id: "1" } });
        const res = await GET(ctx);
        await expectJson(res, 200, { id: 1, name: "My Project" });
        expect(mockStorage.getProject).toHaveBeenCalledWith(1, "user_123");
    });

    it("returns 404 when project not found", async () => {
        mockStorage.getProject.mockResolvedValue(undefined);

        const ctx = createAuthContext("user_123", { params: { id: "999" } });
        const res = await GET(ctx);
        await expectJson(res, 404, { message: "Project not found" });
    });
});

// ─── PUT ───

describe("PUT /api/projects/:id", () => {
    it("returns 401 when not authenticated", async () => {
        const ctx = createMockAPIContext({
            method: "PUT",
            params: { id: "1" },
            body: { name: "Updated" },
        });
        const res = await PUT(ctx);
        await expectJson(res, 401, { error: "Unauthorized" });
        expect(mockStorage.updateProject).not.toHaveBeenCalled();
    });

    it("updates project and returns 200", async () => {
        const existing = { id: 1, name: "Old Name", clerkUserId: "user_123" };
        const updated = { id: 1, name: "New Name", clerkUserId: "user_123" };
        mockStorage.getProject.mockResolvedValue(existing);
        mockStorage.updateProject.mockResolvedValue(updated);

        const ctx = createAuthContext("user_123", {
            method: "PUT",
            params: { id: "1" },
            body: { name: "New Name" },
        });
        const res = await PUT(ctx);
        await expectJson(res, 200, { id: 1, name: "New Name" });
        expect(mockStorage.updateProject).toHaveBeenCalledWith(1, "user_123", { name: "New Name" });
    });

    it("returns 404 when project not found", async () => {
        mockStorage.getProject.mockResolvedValue(undefined);

        const ctx = createAuthContext("user_123", {
            method: "PUT",
            params: { id: "999" },
            body: { name: "Updated" },
        });
        const res = await PUT(ctx);
        await expectJson(res, 404, { message: "Project not found" });
        expect(mockStorage.updateProject).not.toHaveBeenCalled();
    });
});

// ─── DELETE ───

describe("DELETE /api/projects/:id", () => {
    it("returns 401 when not authenticated", async () => {
        const ctx = createMockAPIContext({ params: { id: "1" } });
        const res = await DELETE(ctx);
        await expectJson(res, 401, { error: "Unauthorized" });
        expect(mockStorage.deleteProject).not.toHaveBeenCalled();
    });

    it("cascade-deletes project files then project, returns 204", async () => {
        const project = { id: 1, name: "My Project", clerkUserId: "user_123" };
        mockStorage.getProject.mockResolvedValue(project);
        mockStorage.deleteAllProjectFiles.mockResolvedValue(undefined);
        mockStorage.deleteProject.mockResolvedValue(undefined);

        const ctx = createAuthContext("user_123", { params: { id: "1" } });
        const res = await DELETE(ctx);
        expectNoContent(res);
        expect(mockStorage.deleteAllProjectFiles).toHaveBeenCalledWith(1, "user_123");
        expect(mockStorage.deleteProject).toHaveBeenCalledWith(1, "user_123");
    });

    it("returns 400 when id is not a number", async () => {
        const ctx = createAuthContext("user_123", { params: { id: "abc" } });
        const res = await DELETE(ctx);
        await expectJson(res, 400, { error: 'Invalid project id: "abc"' });
    });

    it("returns 404 when project not found", async () => {
        mockStorage.getProject.mockResolvedValue(undefined);

        const ctx = createAuthContext("user_123", { params: { id: "999" } });
        const res = await DELETE(ctx);
        await expectJson(res, 404, { error: "Project id=999 not found" });
    });

    it("returns 500 on unexpected database error", async () => {
        mockStorage.getProject.mockRejectedValue(new Error("DB connection lost"));

        const ctx = createAuthContext("user_123", { params: { id: "1" } });
        const res = await DELETE(ctx);
        await expectJson(res, 500, { error: "DB connection lost" });
    });
});