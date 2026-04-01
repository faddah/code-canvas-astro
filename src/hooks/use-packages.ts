import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

// ─── Packages (auth-required, CRUD) ───

export function usePackages(userId: string | null | undefined, projectId?: number | null) {
    const enabled = !!userId;

    // Build the query path with optional projectId filter
    let fetchPath: string = api.packages.list.path;
    if (projectId !== undefined) {
        const paramValue: string = projectId === null ? '' : String(projectId);
        fetchPath += `?projectId=${paramValue}`;
    }

    return useQuery({
        queryKey: [api.packages.list.path, userId, projectId],
        enabled,
        queryFn: async () => {
            const res: Response = await fetch(fetchPath);
            if (!res.ok) {
                throw new Error(`Failed to fetch packages (HTTP ${res.status})`);
            }
            return res.json();
        },
        retry: 5,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 16000),
        refetchOnMount: 'always',
        staleTime: 0,
    });
}

export function useAddPackage() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (data: { packageName: string; projectId?: number | null; versionSpec?: string }) => {
            const res = await fetch(api.packages.create.path, {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to add package");
            return res.json();
        },
        onSuccess: (newPkg) => {
            queryClient.invalidateQueries({ queryKey: [api.packages.list.path] });
            toast({
                title: "Package Added",
                description: `${newPkg.packageName} has been added.`,
            });
        },
        onError: () => {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to add package. Please try again.",
            });
        },
    });
}

export function useRemovePackage() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (id: number) => {
            const url = buildUrl(api.packages.delete.path, { id });
            const res = await fetch(url, { method: 'DELETE' });
            if (!res.ok) {
                let serverMsg = `HTTP ${res.status}`;
                try {
                    const body = await res.json();
                    serverMsg = body.error ?? body.message ?? serverMsg;
                } catch(e) {
                    // body was not JSON
                    Error.isError(e) && console.error("The response body was not JSON:", e);
                }
                throw new Error(serverMsg);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.packages.list.path] });
            toast({
                title: "Package Removed",
                description: "The package has been removed.",
            });
        },
        onError: (error) => {
            const msg = error instanceof Error ? error.message : String(error);
            toast({
                variant: "destructive",
                title: "Remove Failed",
                description: msg,
            });
        },
    });
}