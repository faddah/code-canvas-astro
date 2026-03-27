import { test, expect } from "@playwright/test";

test.describe("API Routes", () => {
  // ─── Health Endpoint (public, no auth, no DB) ───

  test("GET /api/health returns 200 with status ok", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBe(true);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("ok");
    expect(typeof data.timestamp).toBe("number");
  });

  test("GET /api/health includes no-store cache header", async ({ request }) => {
    const res = await request.get("/api/health");
    const cacheControl = res.headers()["cache-control"];
    expect(cacheControl).toBe("no-store");
  });

  // ─── Starter Files (public, no auth) ───

  test("GET /api/starter-files returns array", async ({ request }) => {
    const res = await request.get("/api/starter-files");
    expect(res.ok()).toBe(true);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test("GET /api/files returns array (legacy endpoint)", async ({ request }) => {
    const res = await request.get("/api/files");
    expect(res.ok()).toBe(true);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  // ─── User Files (auth-required — expect 401 without auth) ───

  test("GET /api/user-files returns 401 without auth", async ({ request }) => {
    const res = await request.get("/api/user-files");
    expect(res.status()).toBe(401);
  });

  test("POST /api/user-files/create returns 401 without auth", async ({ request }) => {
    const res = await request.post("/api/user-files/create", {
      data: { name: "test.py", content: "# test" },
    });
    expect(res.status()).toBe(401);
  });

  test("DELETE /api/user-files/999 returns 401 without auth", async ({ request }) => {
    const res = await request.delete("/api/user-files/999");
    expect(res.status()).toBe(401);
  });

  // ─── User Profile (auth-required — expect 401 without auth) ───

  test("GET /api/user-profile returns 401 without auth", async ({ request }) => {
    const res = await request.get("/api/user-profile");
    expect(res.status()).toBe(401);
  });

  test("POST /api/user-profile returns 401 without auth", async ({ request }) => {
    const res = await request.post("/api/user-profile", {
      data: { phone: "555-1234" },
    });
    expect(res.status()).toBe(401);
  });

  test("DELETE /api/user-profile returns 401 without auth", async ({ request }) => {
    const res = await request.delete("/api/user-profile");
    expect(res.status()).toBe(401);
  });
});
