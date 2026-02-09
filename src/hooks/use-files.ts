import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertFile, type File } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

// Fetch all files
export function useFiles() {
  return useQuery({
    queryKey: [api.files.list.path],
    queryFn: async () => {
      const res = await fetch(api.files.list.path);
      if (!res.ok) throw new Error("Failed to fetch files");
      return api.files.list.responses[200].parse(await res.json());
    },
  });
}

// Fetch single file
export function useFile(id: number | null) {
  return useQuery({
    queryKey: [api.files.list.path, id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null;
      const url = buildUrl(api.files.update.path, { id });
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch file");
      return api.files.update.responses[200].parse(await res.json());
    },
  });
}

// Create new file
export function useCreateFile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertFile) => {
      const res = await fetch(api.files.create.path, {
        method: api.files.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create file");
      return api.files.create.responses[201].parse(await res.json());
    },
    onSuccess: (newFile) => {
      queryClient.invalidateQueries({ queryKey: [api.files.list.path] });
      toast({
        title: "File Created",
        description: `${newFile.name} has been created successfully.`,
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create file. Please try again.",
      });
    },
  });
}

// Update file content
export function useUpdateFile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<InsertFile>) => {
      const url = buildUrl(api.files.update.path, { id });
      const res = await fetch(url, {
        method: api.files.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update file");
      return api.files.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.files.list.path] });
      // Don't toast on every autosave, it's annoying
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "Could not save your changes.",
      });
    },
  });
}

// Delete file
export function useDeleteFile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.files.delete.path, { id });
      const res = await fetch(url, { method: api.files.delete.method });
      if (!res.ok) throw new Error("Failed to delete file");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.files.list.path] });
      toast({
        title: "File Deleted",
        description: "The file has been permanently removed.",
      });
    },
  });
}
