import {
    useProjects,
    useCreateProject,
    useDeleteProject,
    useMoveFileToProject,
} from "@/hooks/use-projects";

export function useProjectData(userId: string | null | undefined) {
    const { data: projectsData } = useProjects(userId);
    const createProject = useCreateProject();
    const deleteProject = useDeleteProject();
    const moveFileToProject = useMoveFileToProject();

    return {
        projects: projectsData ?? [],
        createProject,
        deleteProject,
        moveFileToProject,
    };
}