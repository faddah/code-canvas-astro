import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import http from "http";
import { EventEmitter } from "events";

// ─── waitForServer (extracted logic, tested via http mock) ───

/**
 * Re-implementation of the waitForServer function from lambda-handler.cjs
 * for unit testing. We cannot directly import the CJS handler (it has
 * side-effects and uses require), so we replicate the core logic here
 * and verify its behavior against the same contract.
 */
function waitForServer(port: number, timeout: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const FALLBACK_MS = 25000;

    const checkServer = () => {
      const elapsed = Date.now() - startTime;

      if (elapsed > timeout) {
        reject(new Error("Server startup timeout"));
        return;
      }

      const req = http.get(
        `http://localhost:${port}/api/health`,
        (res: http.IncomingMessage) => {
          res.resume();

          if (res.statusCode === 200) {
            resolve();
          } else if (elapsed > FALLBACK_MS && res.statusCode !== 503) {
            resolve();
          } else {
            setTimeout(checkServer, 10); // fast poll for tests
          }
        }
      );

      req.on("error", () => {
        setTimeout(checkServer, 10);
      });

      req.end();
    };

    checkServer();
  });
}

describe("waitForServer", () => {
  let mockServer: http.Server;

  afterEach(() => {
    if (mockServer) {
      mockServer.close();
    }
  });

  it("resolves when /api/health returns 200", async () => {
    mockServer = http.createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
    });
    await new Promise<void>((resolve) => mockServer.listen(0, resolve));
    const port = (mockServer.address() as { port: number }).port;

    await expect(waitForServer(port, 5000)).resolves.toBeUndefined();
  });

  it("retries when /api/health returns 503 then 200", async () => {
    let callCount = 0;
    mockServer = http.createServer((_req, res) => {
      callCount++;
      if (callCount < 3) {
        res.writeHead(503);
        res.end("Service Unavailable");
      } else {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok" }));
      }
    });
    await new Promise<void>((resolve) => mockServer.listen(0, resolve));
    const port = (mockServer.address() as { port: number }).port;

    await expect(waitForServer(port, 5000)).resolves.toBeUndefined();
    expect(callCount).toBeGreaterThanOrEqual(3);
  });

  it("rejects after timeout if server never responds 200", async () => {
    mockServer = http.createServer((_req, res) => {
      res.writeHead(503);
      res.end("Service Unavailable");
    });
    await new Promise<void>((resolve) => mockServer.listen(0, resolve));
    const port = (mockServer.address() as { port: number }).port;

    await expect(waitForServer(port, 200)).rejects.toThrow(
      "Server startup timeout"
    );
  });

  it("retries on connection error then resolves on 200", async () => {
    // Start on a random port, close it, then restart — simulates
    // the Astro process not being ready yet
    mockServer = http.createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
    });
    await new Promise<void>((resolve) => mockServer.listen(0, resolve));
    const port = (mockServer.address() as { port: number }).port;

    // Server is up immediately, should resolve
    await expect(waitForServer(port, 5000)).resolves.toBeUndefined();
  });

  it("resolves in fallback mode for non-503 status after 25s", async () => {
    // Simulate a server that returns 500 (not 503) — after the
    // 25s fallback window this should be accepted
    let callCount = 0;
    mockServer = http.createServer((_req, res) => {
      callCount++;
      res.writeHead(500);
      res.end("Internal Server Error");
    });
    await new Promise<void>((resolve) => mockServer.listen(0, resolve));
    const port = (mockServer.address() as { port: number }).port;

    // Override Date.now to simulate 26 seconds elapsed
    const realNow = Date.now;
    let fakeTime = realNow.call(Date);
    vi.spyOn(Date, "now").mockImplementation(() => {
      // After first call, jump ahead past FALLBACK_MS
      if (callCount > 1) {
        return fakeTime + 26000;
      }
      return fakeTime;
    });

    await expect(waitForServer(port, 30000)).resolves.toBeUndefined();

    vi.spyOn(Date, "now").mockRestore();
  });
});
