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

import { DELETE } from "@/pages/api/packages/[id]";

beforeEach(() => {
    vi.clearAllMocks();
});

describe("DELETE /api/packages/:id", () => {
    it("returns 401 when not authenticated", async () => {
        const ctx = createMockAPIContext({ params: { id: "1" } });
        const res = await DELETE(ctx);
        await expectJson(res, 401, { error: "Unauthorized" });
        expect(mockStorage.removeProjectPackage).not.toHaveBeenCalled();
    });

    it("deletes package and returns 204", async () => {
        mockStorage.removeProjectPackage.mockResolvedValue(undefined);

        const ctx = createAuthContext("user_123", { params: { id: "1" } });
        const res = await DELETE(ctx);
        expectNoContent(res);
        expect(mockStorage.removeProjectPackage).toHaveBeenCalledWith(1, "user_123");
    });

    it("returns 400 when id is not a number", async () => {
        const ctx = createAuthContext("user_123", { params: { id: "abc" } });
        const res = await DELETE(ctx);
        await expectJson(res, 400, { error: 'Invalid package id: "abc"' });
    });

    it("returns 500 on unexpected database error", async () => {
        mockStorage.removeProjectPackage.mockRejectedValue(new Error("DB connection lost"));

        const ctx = createAuthContext("user_123", { params: { id: "1" } });
        const res = await DELETE(ctx);
        await expectJson(res, 500, { error: "DB connection lost" });
    });
});