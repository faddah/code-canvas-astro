import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockAPIContext } from "../../helpers/mock-api-context";
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
vi.mock("@/lib/db/storage", () => {
    return {
        DatabaseStorage: class {
            constructor() {
                return mockStorage;
            }
        },
    };
});

import { GET } from "@/pages/api/files/index";

beforeEach(() => {
    vi.clearAllMocks();
});

describe("GET /api/files", () => {
    it("returns existing files", async () => {
        const files = [
            { id: 1, name: "main.py", content: "print('hi')" },
        ];
        mockStorage.getFiles.mockResolvedValue(files);

        const ctx = createMockAPIContext();
        const res = await GET(ctx);
        await expectJson(res, 200, [{ id: 1, name: "main.py" }]);
    });

    it("seeds default files when none exist", async () => {
        mockStorage.getFiles
            .mockResolvedValueOnce([])  // first call: empty
            .mockResolvedValueOnce([    // second call: after seeding
                { id: 1, name: "main.py", content: "..." },
                { id: 2, name: "utils.py", content: "..." },
            ]);
        mockStorage.createFile.mockResolvedValue({});

        const ctx = createMockAPIContext();
        const res = await GET(ctx);

        expect(res.status).toBe(200);
        expect(mockStorage.createFile).toHaveBeenCalledTimes(2);
        expect(mockStorage.createFile).toHaveBeenCalledWith(
            expect.objectContaining({ name: "main.py" })
        );
        expect(mockStorage.createFile).toHaveBeenCalledWith(
            expect.objectContaining({ name: "utils.py" })
        );
    });

    it("returns 200 with empty array when getFiles returns empty after seeding", async () =>{
        mockStorage.getFiles.mockResolvedValue([]);
        mockStorage.createFile.mockResolvedValue({});

        const ctx = createMockAPIContext();
        const res = await GET(ctx);

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toEqual([]);
    });
});