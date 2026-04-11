import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn()", () => {
    it("merges class names", () => {
        expect(cn("foo", "bar")).toBe("foo bar");
    });

    it("handles conditional classes", () => {
        expect(cn("base", false && "hidden", "visible")).toBe("base visible");
    });

    it("deduplicates tailwind classes (last wins)", () => {
        expect(cn("p-2", "p-4")).toBe("p-4");
    });

    it("merges conflicting tailwind utilities", () => {
        expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
    });

    it("handles undefined and null inputs", () => {
        expect(cn("base", undefined, null, "end")).toBe("base end");
    });

    it("returns empty string with no inputs", () => {
        expect(cn()).toBe("");
    });
});