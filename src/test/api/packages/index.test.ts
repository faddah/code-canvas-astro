import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    createMockAPIContext,
    createAuthContext,
} from "../../helpers/mock-api-context";
import { expectJson } from "../../helpers/response-helpers";

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

import { GET } from "@/pages/api/packages/index";

beforeEach(() => {
    vi.clearAllMocks();
});

describe("GET /api/packages", () => {
    it("returns 401 when not authenticated", async () => {
        const ctx = createMockAPIContext();
        const res = await GET(ctx);
        await expectJson(res, 401, { error: "Unauthorized" });
        expect(mockStorage.getAllUserPackages).not.toHaveBeenCalled();
    });

    it("returns all user packages when no projectId param", async () => {
        const packages = [{ id: 1, name: "numpy", clerkUserId: "user_123" }];
        mockStorage.getAllUserPackages.mockResolvedValue(packages);

        const ctx = createAuthContext("user_123");
        const res = await GET(ctx);
        await expectJson(res, 200, [{ id: 1, name: "numpy" }]);
        expect(mockStorage.getAllUserPackages).toHaveBeenCalledWith("user_123");
    });

    it("filters by projectId when param is a number", async () => {
        const packages = [{ id: 1, name: "pandas", projectId: 5 }];
        mockStorage.getProjectPackages.mockResolvedValue(packages);

        const ctx = createAuthContext("user_123", {
        url: "http://localhost:4321/api/packages?projectId=5",
        });
        const res = await GET(ctx);
        await expectJson(res, 200, [{ id: 1, name: "pandas" }]);
        expect(mockStorage.getProjectPackages).toHaveBeenCalledWith("user_123", 5);
    });

    it("passes null projectId when param is empty string", async () => {
        mockStorage.getProjectPackages.mockResolvedValue([]);

        const ctx = createAuthContext("user_123", {
        url: "http://localhost:4321/api/packages?projectId=",
        });
        const res = await GET(ctx);
        expect(res.status).toBe(200);
        expect(mockStorage.getProjectPackages).toHaveBeenCalledWith(
        "user_123",
        null,
        );
    });

    it("returns 500 on database error", async () => {
        mockStorage.getAllUserPackages.mockRejectedValue(new Error("DB down"));

        const ctx = createAuthContext("user_123");
        const res = await GET(ctx);
        await expectJson(res, 500, { error: "DB down" });
    });
});
