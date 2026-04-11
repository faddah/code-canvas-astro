/**
   * Factory for building minimal Astro APIContext objects for route testing.
   * Only provides the fields that route handlers actually use:
   * request, params, locals.auth(), and url.
   */

type MockContextOptions = {
    method?: string;
    body?: unknown;
    params?: Record<string, string>;
    userId?: string | null;
    url?: string;
};

/** Build a mock APIContext with sensible defaults */
export function createMockAPIContext(opts: MockContextOptions = {}) {
    const {
        method = "GET",
        body,
        params = {},
        userId = null,
        url = "http://localhost:4321",
    } = opts;

    const init: RequestInit = {
        method,
        headers: { "Content-Type": "application/json" },
    };

    // Only attach body for methods that support it
    if (body !== undefined && method !== "GET" && method !== "HEAD") {
        init.body = JSON.stringify(body);
    }

    return {
        request: new Request(url, init),
        params,
        locals: {
        auth: () => ({ userId }),
        },
        url: new URL(url),
    } as any;
}

/** Shorthand for an unauthenticated context (userId = null) */
export function createUnauthContext(opts: Omit<MockContextOptions, "userId"> = {}) {
    return createMockAPIContext({ ...opts, userId: null });
}

/** Shorthand for an authenticated context */
export function createAuthContext(userId: string, opts: Omit<MockContextOptions, "userId">
= {}) {
    return createMockAPIContext({ ...opts, userId });
}

/** Build a Request that will throw when .json() is called (for testing invalid JSON
 handling) */
export function createInvalidJsonRequest(method: string, url = "http://localhost:4321") {
    return new Request(url, {
        method,
        body: "not-valid-json{{{",
        headers: { "Content-Type": "application/json" },
    });
}