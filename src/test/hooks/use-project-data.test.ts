import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useProjectData } from "@/hooks/use-project-data";

const mockCreateProject = { mutate: vi.fn(), mutateAsync: vi.fn() };
const mockDeleteProject = { mutate: vi.fn(), mutateAsync: vi.fn() };
const mockMoveFileToProject = { mutate: vi.fn(), mutateAsync: vi.fn() };

let mockProjectsData: any[] | undefined = undefined;

vi.mock("@/hooks/use-projects", () => ({
    useProjects: () => ({ data: mockProjectsData }),
    useCreateProject: () => mockCreateProject,
    useDeleteProject: () => mockDeleteProject,
    useMoveFileToProject: () => mockMoveFileToProject,
}));

describe("useProjectData", () => {
    it("returns empty array when projectsData is undefined", () => {
        mockProjectsData = undefined;
        const { result } = renderHook(() => useProjectData("user_123"));
        expect(result.current.projects).toEqual([]);
    });

    it("returns projects when data is available", () => {
        mockProjectsData = [
            { id: 1, name: "Project A" },
            { id: 2, name: "Project B" },
        ];
        const { result } = renderHook(() => useProjectData("user_123"));
        expect(result.current.projects).toEqual(mockProjectsData);
    });

    it("exposes createProject mutation", () => {
        const { result } = renderHook(() => useProjectData("user_123"));
        expect(result.current.createProject).toBe(mockCreateProject);
    });

    it("exposes deleteProject mutation", () => {
        const { result } = renderHook(() => useProjectData("user_123"));
        expect(result.current.deleteProject).toBe(mockDeleteProject);
    });

    it("exposes moveFileToProject mutation", () => {
        const { result } = renderHook(() => useProjectData("user_123"));
        expect(result.current.moveFileToProject).toBe(mockMoveFileToProject);
    });
});
