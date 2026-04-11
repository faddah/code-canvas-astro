import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    createMockAPIContext,
    createAuthContext,
    createInvalidJsonRequest,
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

import { POST } from "@/pages/api/user-files/create";

beforeEach(() => {
    vi.clearAllMocks();
});

describe("POST /api/user-files/create", () => {
    it("returns 401 when not authenticated", async () => {
        const ctx = createMockAPIContext({
        method: "POST",
        body: { name: "app.py", content: "code" },
        });
        const res = await POST(ctx);
        await expectJson(res, 401, { error: "Unauthorized" });
        expect(mockStorage.createUserFile).not.toHaveBeenCalled();
    });

    it("creates a user file and returns 201", async () => {
        const body = { name: "app.py", content: "# my app" };
        const created = { id: 1, ...body, clerkUserId: "user_123" };
        mockStorage.createUserFile.mockResolvedValue(created);

        const ctx = createAuthContext("user_123", {
        method: "POST",
        body,
        });
        const res = await POST(ctx);
        await expectJson(res, 201, { id: 1, name: "app.py" });
        expect(mockStorage.createUserFile).toHaveBeenCalledWith({
        name: "app.py",
        content: "# my app",
        clerkUserId: "user_123",
        });
    });

    it("returns 400 on invalid JSON body", async () => {
        const ctx = createAuthContext("user_123");
        ctx.request = createInvalidJsonRequest("POST");

        const res = await POST(ctx);
        await expectJson(res, 400, { message: "Invalid input" });
    });

    it("returns 400 when database rejects the input", async () => {
        mockStorage.createUserFile.mockRejectedValue(new Error("DB constraint"));

        const ctx = createAuthContext("user_123", {
        method: "POST",
        body: { name: "", content: "" },
        });
        const res = await POST(ctx);
        await expectJson(res, 400, { message: "Invalid input" });
    });
});
