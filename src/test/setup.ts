import "@testing-library/jest-dom/vitest";
import { vi, beforeAll, afterAll } from "vitest";

beforeAll(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    // Keep console.error visible — you usually want to see real errors
});

afterAll(() => {
    vi.restoreAllMocks();
});
