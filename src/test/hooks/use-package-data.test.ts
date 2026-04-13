import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePackageData } from "@/hooks/use-package-data";

const mockAddPackage = { mutate: vi.fn(), mutateAsync: vi.fn() };
const mockRemovePackage = { mutate: vi.fn(), mutateAsync: vi.fn() };

let mockPackagesData: any[] | undefined = undefined;

vi.mock("@/hooks/use-packages", () => ({
    usePackages: () => ({ data: mockPackagesData }),
    useAddPackage: () => mockAddPackage,
    useRemovePackage: () => mockRemovePackage,
}));

describe("usePackageData", () => {
    it("returns empty array when packagesData is undefined", () => {
        mockPackagesData = undefined;
        const { result } = renderHook(() => usePackageData("user_123", 1));
        expect(result.current.packages).toEqual([]);
    });

    it("returns packages when data is available", () => {
        mockPackagesData = [
            { id: 1, packageName: "numpy" },
            { id: 2, packageName: "requests" },
        ];
        const { result } = renderHook(() => usePackageData("user_123", 1));
        expect(result.current.packages).toEqual(mockPackagesData);
    });

    it("exposes addPackage mutation", () => {
        const { result } = renderHook(() => usePackageData("user_123", 1));
        expect(result.current.addPackage).toBe(mockAddPackage);
    });

    it("exposes removePackage mutation", () => {
        const { result } = renderHook(() => usePackageData("user_123", 1));
        expect(result.current.removePackage).toBe(mockRemovePackage);
    });
});
