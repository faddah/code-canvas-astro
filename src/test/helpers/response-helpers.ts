import { expect } from "vitest";

/**
 * Assert a Response has the expected status code and JSON body.
 * Uses toMatchObject so you can pass a subset of expected fields.
 */
export async function expectJson(
    response: Response,
    status: number,
    bodySubset: Record<string, unknown> | unknown[],
) {
    expect(response.status).toBe(status);
    const data = await response.json();
    expect(data).toMatchObject(bodySubset);
    return data;
}

/**
 * Assert a Response is 204 No Content with no body.
 */
export function expectNoContent(response: Response) {
    expect(response.status).toBe(204);
}