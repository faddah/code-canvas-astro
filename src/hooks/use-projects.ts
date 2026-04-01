import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/schema";
import type { Project } from "@shared/schema"; 
import { useToast } from "@/hooks/use-toast";

export function useProjects(userId: string | null | undefined) {
  return useQuery<Project[]>({
    queryKey: [api.projects.list.path, userId],
    enabled: !!userId,
    queryFn: async () => {
      const res: Response = await fetch(api.projects.list.path);
      if (!res.ok) throw new Error(`Failed to fetch projects (HTTP ${res.status})`);
      return res.json();
    },
    refetchOnMount: 'always' as const,
    staleTime: 0,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const res = await fetch(api.projects.create.path, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create project");
      return res.json();
    },
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: [api.projects.list.path] });
      toast({
        title: "Project Created",
        description: `"${newProject.name}" has been created.`,
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create project. Please try again.",
      });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number; name?: string; description?: string }) => {
      const url = buildUrl(api.projects.update.path, { id });
      const res = await fetch(url, {
        method: 'PUT',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update project");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.projects.list.path] });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update project.",
      });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.projects.delete.path, { id });
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) {
        let serverMsg = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          serverMsg = body.error ?? body.message ?? serverMsg;
        } catch { /* not JSON */ }
        throw new Error(serverMsg);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.projects.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.userFiles.list.path] });
      toast({
        title: "Project Deleted",
        description: "The project and all its files have been removed.",
      });
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : String(error);
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: msg,
      });
    },
  });
}

export function useMoveFileToProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ fileId, projectId }: { fileId: number; projectId: number | null }) => {
      const url = buildUrl(api.userFiles.update.path, { id: fileId });
      const res = await fetch(url, {
        method: 'PUT',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) throw new Error("Failed to move file");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.userFiles.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.projects.list.path] });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to move file.",
      });
    },
  });
}
