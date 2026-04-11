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

import { GET, PUT, PATCH, DELETE } from "@/pages/api/user-files/[id]";

beforeEach(() => {
    vi.clearAllMocks();
});

// ─── GET ───

describe("GET /api/user-files/:id", () => {
    it("returns 401 when not authenticated", async () => {
        const ctx = createMockAPIContext({ params: { id: "1" } });
        const res = await GET(ctx);
        await expectJson(res, 401, { error: "Unauthorized" });
        expect(mockStorage.getUserFile).not.toHaveBeenCalled();
    });

    it("returns file when found", async () => {
        const file = { id: 1, name: "app.py", content: "code" };
        mockStorage.getUserFile.mockResolvedValue(file);

        const ctx = createAuthContext("user_123", { params: { id: "1" } });
        const res = await GET(ctx);
        await expectJson(res, 200, { id: 1, name: "app.py" });
        expect(mockStorage.getUserFile).toHaveBeenCalledWith(1, "user_123");
    });

    it("returns 404 when file not found", async () => {
        mockStorage.getUserFile.mockResolvedValue(undefined);

        const ctx = createAuthContext("user_123", { params: { id: "999" } });
        const res = await GET(ctx);
        await expectJson(res, 404, { message: "File not found" });
    });
});

// ─── PUT ───

describe("PUT /api/user-files/:id", () => {
    it("returns 401 when not authenticated", async () => {
        const ctx = createMockAPIContext({
            method: "PUT",
            params: { id: "1" },
            body: { content: "new" },
        });
        const res = await PUT(ctx);
        await expectJson(res, 401, { error: "Unauthorized" });
        expect(mockStorage.updateUserFile).not.toHaveBeenCalled();
    });

    it("updates file and returns 200", async () => {
        const existing = { id: 1, name: "app.py", content: "old" };
        const updated = { id: 1, name: "app.py", content: "new" };
        mockStorage.getUserFile.mockResolvedValue(existing);
        mockStorage.updateUserFile.mockResolvedValue(updated);

        const ctx = createAuthContext("user_123", {
            method: "PUT",
            params: { id: "1" },
            body: { content: "new" },
        });
        const res = await PUT(ctx);
        await expectJson(res, 200, { id: 1, content: "new" });
        expect(mockStorage.updateUserFile).toHaveBeenCalledWith(1, "user_123", { content:
"new" });
    });

    it("returns 404 when file not found", async () => {
        mockStorage.getUserFile.mockResolvedValue(undefined);

        const ctx = createAuthContext("user_123", {
            method: "PUT",
            params: { id: "999" },
            body: { content: "new" },
        });
        const res = await PUT(ctx);
        await expectJson(res, 404, { message: "File not found" });
        expect(mockStorage.updateUserFile).not.toHaveBeenCalled();
    });
});

// ─── PATCH ───

describe("PATCH /api/user-files/:id", () => {
    it("returns 401 when not authenticated", async () => {
        const ctx = createMockAPIContext({
            method: "PATCH",
            params: { id: "1" },
            body: { content: "patched" },
        });
        const res = await PATCH(ctx);
        await expectJson(res, 401, { error: "Unauthorized" });
    });

    it("updates file and returns 200", async () => {
        const existing = { id: 1, name: "app.py", content: "old" };
        const updated = { id: 1, name: "app.py", content: "patched" };
        mockStorage.getUserFile.mockResolvedValue(existing);
        mockStorage.updateUserFile.mockResolvedValue(updated);

        const ctx = createAuthContext("user_123", {
            method: "PATCH",
            params: { id: "1" },
            body: { content: "patched" },
        });
        const res = await PATCH(ctx);
        await expectJson(res, 200, { content: "patched" });
    });

    it("returns 404 when file not found", async () => {
        mockStorage.getUserFile.mockResolvedValue(undefined);

        const ctx = createAuthContext("user_123", {
            method: "PATCH",
            params: { id: "999" },
            body: { content: "patched" },
        });
        const res = await PATCH(ctx);
        await expectJson(res, 404, { message: "File not found" });
    });
});

// ─── DELETE ───

describe("DELETE /api/user-files/:id", () => {
    it("returns 401 when not authenticated", async () => {
        const ctx = createMockAPIContext({ params: { id: "1" } });
        const res = await DELETE(ctx);
        await expectJson(res, 401, { error: "Unauthorized" });
        expect(mockStorage.deleteUserFile).not.toHaveBeenCalled();
    });

    it("deletes file and returns 204", async () => {
        const file = { id: 1, name: "app.py", content: "code" };
        mockStorage.getUserFile.mockResolvedValue(file);
        mockStorage.deleteUserFile.mockResolvedValue(undefined);

        const ctx = createAuthContext("user_123", { params: { id: "1" } });
        const res = await DELETE(ctx);
        expectNoContent(res);
        expect(mockStorage.deleteUserFile).toHaveBeenCalledWith(1, "user_123");
    });

    it("returns 400 when id is not a number", async () => {
        const ctx = createAuthContext("user_123", { params: { id: "abc" } });
        const res = await DELETE(ctx);
        await expectJson(res, 400, { error: 'Invalid file id: "abc"' });
    });

    it("returns 404 when file not found", async () => {
        mockStorage.getUserFile.mockResolvedValue(undefined);

        const ctx = createAuthContext("user_123", { params: { id: "999" } });
        const res = await DELETE(ctx);
        await expectJson(res, 404, { error: "File id=999 not found" });
    });

    it("returns 500 on unexpected database error", async () => {
        mockStorage.getUserFile.mockRejectedValue(new Error("DB connection lost"));

        const ctx = createAuthContext("user_123", { params: { id: "1" } });
        const res = await DELETE(ctx);
        await expectJson(res, 500, { error: "DB connection lost" });
    });
});