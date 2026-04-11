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

import { GET } from "@/pages/api/user-files/index";

beforeEach(() => {
    vi.clearAllMocks();
});

describe("GET /api/user-files", () => {
    it("returns 401 when not authenticated", async () => {
        const ctx = createMockAPIContext();
        const res = await GET(ctx);
        await expectJson(res, 401, { error: "Unauthorized" });
        expect(mockStorage.getUserFiles).not.toHaveBeenCalled();
    });

    it("returns user files when authenticated", async () => {
        const files = [{ id: 1, name: "app.py", content: "code" }];
        mockStorage.getUserFiles.mockResolvedValue(files);

        const ctx = createAuthContext("user_123");
        const res = await GET(ctx);
        await expectJson(res, 200, [{ id: 1, name: "app.py" }]);
        expect(mockStorage.getUserFiles).toHaveBeenCalledWith("user_123");
    });

    it("includes no-store cache header", async () => {
        mockStorage.getUserFiles.mockResolvedValue([]);

        const ctx = createAuthContext("user_123");
        const res = await GET(ctx);
        expect(res.headers.get("Cache-Control")).toBe("no-store");
    });

    it("returns 500 on database error", async () => {
        mockStorage.getUserFiles.mockRejectedValue(new Error("DB down"));

        const ctx = createAuthContext("user_123");
        const res = await GET(ctx);
        await expectJson(res, 500, { error: "DB down" });
    });
});