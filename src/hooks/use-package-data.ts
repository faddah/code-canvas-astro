import {
    usePackages,
    useAddPackage,
    useRemovePackage,
} from "@/hooks/use-packages";

export function usePackageData(
    userId: string | null | undefined,
    projectId?: number | null,
    ) {
    const { data: packagesData } = usePackages(userId, projectId);
    const addPackage = useAddPackage();
    const removePackage = useRemovePackage();

    return {
        packages: packagesData ?? [],
        addPackage,
        removePackage,
    };
}
