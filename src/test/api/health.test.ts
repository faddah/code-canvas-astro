import { describe, it, expect } from "vitest";
import { GET } from "@/pages/api/health";
import { createMockAPIContext } from "../helpers/mock-api-context";
import { expectJson } from "../helpers/response-helpers";

describe("GET /api/health", () => {
    it("returns 200 with status ok", async () => {
        const ctx = createMockAPIContext();
        const res = await GET(ctx);
        const data = await expectJson(res, 200, { status: "ok" });
        expect(data.timestamp).toBeTypeOf("number");
    });

    it("includes no-store cache header", async () => {
        const ctx = createMockAPIContext();
        const res = await GET(ctx);
        expect(res.headers.get("Cache-Control")).toBe("no-store");
    });
});