import { vi } from "vitest";

/**
 * Creates a mock object implementing every method of the IStorage interface.
 * Each method is a vi.fn() that can be configured per test with
 * mockResolvedValue, mockRejectedValue, etc.
 */
export function createMockStorage() {
    return {
        // Legacy (backward compat)
        getFiles: vi.fn(),
        getFile: vi.fn(),
        createFile: vi.fn(),
        updateFile: vi.fn(),
        deleteFile: vi.fn(),

        // Starter files
        getStarterFiles: vi.fn(),
        getStarterFile: vi.fn(),

        // User files
        getUserFiles: vi.fn(),
        getUserFile: vi.fn(),
        createUserFile: vi.fn(),
        updateUserFile: vi.fn(),
        deleteUserFile: vi.fn(),

        // User profiles
        getUserProfile: vi.fn(),
        createUserProfile: vi.fn(),
        updateUserProfile: vi.fn(),
        deleteUserProfile: vi.fn(),

        // Projects
        getProjects: vi.fn(),
        getProject: vi.fn(),
        createProject: vi.fn(),
        updateProject: vi.fn(),
        deleteProject: vi.fn(),
        getProjectFiles: vi.fn(),

        // Bulk operations
        deleteAllUserFiles: vi.fn(),
        deleteAllProjectFiles: vi.fn(),

        // Project packages
        getProjectPackages: vi.fn(),
        getAllUserPackages: vi.fn(),
        addProjectPackage: vi.fn(),
        removeProjectPackage: vi.fn(),
        removeAllProjectPackages: vi.fn(),
    };
}