import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockAPIContext } from "../../helpers/mock-api-context";
import { expectJson } from "../../helpers/response-helpers";
import { expectNoContent } from "../../helpers/response-helpers";

const mockStorage = vi.hoisted(() => ({
    getFile: vi.fn(),
    updateFile: vi.fn(),
    deleteFile: vi.fn(),
}));

vi.mock("@/lib/db/storage", () => ({
    DatabaseStorage: class { constructor() { return mockStorage; } },
}));

import { GET, PUT, PATCH, DELETE } from "@/pages/api/files/[id]";

beforeEach(() => {
    vi.clearAllMocks();
});

  // ─── GET ───

describe("GET /api/files/:id", () => {
    it("returns file when found", async () => {
        const file = { id: 1, name: "main.py", content: "print('hi')" };
        mockStorage.getFile.mockResolvedValue(file);

        const ctx = createMockAPIContext({ params: { id: "1" } });
        const res = await GET(ctx);
        await expectJson(res, 200, { id: 1, name: "main.py" });
    });

    it("returns 404 when file not found", async () => {
        mockStorage.getFile.mockResolvedValue(undefined);

        const ctx = createMockAPIContext({ params: { id: "999" } });
        const res = await GET(ctx);
        await expectJson(res, 404, { message: "File not found" });
    });
});

  // ─── PUT ───

describe("PUT /api/files/:id", () => {
    it("updates file and returns 200", async () => {
        const existing = { id: 1, name: "main.py", content: "old" };
        const updated = { id: 1, name: "main.py", content: "new" };
        mockStorage.getFile.mockResolvedValue(existing);
        mockStorage.updateFile.mockResolvedValue(updated);

        const ctx = createMockAPIContext({
            method: "PUT",
            params: { id: "1" },
            body: { content: "new" },
        });
        const res = await PUT(ctx);
        await expectJson(res, 200, { id: 1, content: "new" });
        expect(mockStorage.updateFile).toHaveBeenCalledWith(1, { content: "new" });
    });

    it("returns 404 when file not found", async () => {
        mockStorage.getFile.mockResolvedValue(undefined);

        const ctx = createMockAPIContext({
            method: "PUT",
            params: { id: "999" },
            body: { content: "new" },
        });
        const res = await PUT(ctx);
        await expectJson(res, 404, { message: "File not found" });
        expect(mockStorage.updateFile).not.toHaveBeenCalled();
    });
});

  // ─── PATCH ───

describe("PATCH /api/files/:id", () => {
    it("updates file and returns 200", async () => {
        const existing = { id: 1, name: "main.py", content: "old" };
        const updated = { id: 1, name: "main.py", content: "patched" };
        mockStorage.getFile.mockResolvedValue(existing);
        mockStorage.updateFile.mockResolvedValue(updated);

        const ctx = createMockAPIContext({
            method: "PATCH",
            params: { id: "1" },
            body: { content: "patched" },
        });
        const res = await PATCH(ctx);
        await expectJson(res, 200, { content: "patched" });
    });

    it("returns 404 when file not found", async () => {
        mockStorage.getFile.mockResolvedValue(undefined);

        const ctx = createMockAPIContext({
            method: "PATCH",
            params: { id: "999" },
            body: { content: "patched" },
        });
        const res = await PATCH(ctx);
        await expectJson(res, 404, { message: "File not found" });
    });
});

  // ─── DELETE ───

describe("DELETE /api/files/:id", () => {
    it("deletes file and returns 204", async () => {
        const file = { id: 1, name: "main.py", content: "print('hi')" };
        mockStorage.getFile.mockResolvedValue(file);
        mockStorage.deleteFile.mockResolvedValue(undefined);

        const ctx = createMockAPIContext({ params: { id: "1" } });
        const res = await DELETE(ctx);
        expectNoContent(res);
        expect(mockStorage.deleteFile).toHaveBeenCalledWith(1);
    });

    it("returns 400 when id is not a number", async () => {
        const ctx = createMockAPIContext({ params: { id: "abc" } });
        const res = await DELETE(ctx);
        await expectJson(res, 400, { error: 'Invalid file id: "abc"' });
    });

    it("returns 404 when file not found", async () => {
        mockStorage.getFile.mockResolvedValue(undefined);

        const ctx = createMockAPIContext({ params: { id: "999" } });
        const res = await DELETE(ctx);
        await expectJson(res, 404, { error: "File id=999 not found" });
    });

    it("returns 500 on unexpected database error", async () => {
        const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        mockStorage.getFile.mockRejectedValue(new Error("DB connection lost"));

        const ctx = createMockAPIContext({ params: { id: "1" } });
        const res = await DELETE(ctx);
        await expectJson(res, 500, { error: "DB connection lost" });
        errSpy.mockRestore();
    });
});