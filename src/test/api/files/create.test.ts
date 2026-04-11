import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockAPIContext } from "../../helpers/mock-api-context";
import { createInvalidJsonRequest } from "../../helpers/mock-api-context";
import { expectJson } from "../../helpers/response-helpers";

const mockStorage = vi.hoisted(() => ({
    getFiles: vi.fn(),
    getFile: vi.fn(),
    createFile: vi.fn(),
    updateFile: vi.fn(),
    deleteFile: vi.fn(),
}));

vi.mock("@/lib/db/storage", () => ({
    storage: mockStorage,
}));

import { POST } from "@/pages/api/files/create";

beforeEach(() => {
    vi.clearAllMocks();
});

describe("POST /api/files/create", () => {
    it("creates a file and returns 201", async () => {
        const body = { name: "new.py", content: "# new file" };
        const created = { id: 1, ...body };
        mockStorage.createFile.mockResolvedValue(created);

        const ctx = createMockAPIContext({ method: "POST", body });
        const res = await POST(ctx);
        await expectJson(res, 201, { id: 1, name: "new.py" });
        expect(mockStorage.createFile).toHaveBeenCalledWith(body);
    });

    it("returns 400 on invalid JSON body", async () => {
        const ctx = createMockAPIContext();
        ctx.request = createInvalidJsonRequest("POST");

        const res = await POST(ctx);
        await expectJson(res, 400, { message: "Invalid input" });
    });

    it("returns 400 when database rejects the input", async () => {
        mockStorage.createFile.mockRejectedValue(new Error("DB constraint"));

        const ctx = createMockAPIContext({
            method: "POST",
            body: { name: "", content: "" },
        });
        const res = await POST(ctx);
        await expectJson(res, 400, { message: "Invalid input" });
    });
});