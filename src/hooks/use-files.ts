import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertFile, type File } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

// ─── Starter Files (read-only, shown to all users) ───

export function useStarterFiles() {
  return useQuery({
    queryKey: [api.starterFiles.list.path],
    queryFn: async (): Promise<File[]> => {
      const res = await fetch(api.starterFiles.list.path);
      if (!res.ok) throw new Error("Failed to fetch starter files");
      return res.json();
    },
  });
}

// ─── User Files (auth-required, CRUD) ───

export function useUserFiles(userId: string | null | undefined) {
  const enabled = !!userId;
  return useQuery({
    // Include userId in the key so React Query separates caches per user
    // and automatically refetches when the userId changes (e.g. on login).
    queryKey: [api.userFiles.list.path, userId],
    enabled,
    queryFn: async (): Promise<File[]> => {
      console.log(`[useUserFiles] Fetching user files for userId=${userId}`);
      const res = await fetch(api.userFiles.list.path);
      if (!res.ok) {
        console.warn(`[useUserFiles] Server responded ${res.status}`);
        throw new Error(`Failed to fetch user files (HTTP ${res.status})`);
      }
      const data = await res.json();
      console.log(`[useUserFiles] Received ${Array.isArray(data) ? data.length : '?'} files`);
      return data;
    },
    // On page refresh, Clerk's session token may be expired for the first
    // request(s) while the client SDK refreshes it.  Use a longer retry
    // window (5 attempts, up to ~62s total) so the refreshed cookie is
    // available by the time we retry.
    retry: 5,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 16000),
    // Always refetch when the query is re-enabled (e.g., after auth state
    // transitions from signed-out → signed-in during page refresh).
    refetchOnMount: 'always',
    // Don't use stale data from a previous session — always fetch fresh.
    staleTime: 0,
  });
}

export function useCreateUserFile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { name: string; content: string }) => {
      const res = await fetch(api.userFiles.create.path, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create file");
      return res.json();
    },
    onSuccess: (newFile) => {
      queryClient.invalidateQueries({ queryKey: [api.userFiles.list.path] });
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

export function useUpdateUserFile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number; name?: string; content?: string; projectId?: number | null }) => {
      const url = buildUrl(api.userFiles.update.path, { id });
      const res = await fetch(url, {
        method: 'PUT',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update file");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.userFiles.list.path] });
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

export function useDeleteUserFile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.userFiles.delete.path, { id });
      console.log(`[useDeleteUserFile] Sending DELETE ${url}`);
      const res = await fetch(url, { method: 'DELETE' });
      console.log(`[useDeleteUserFile] Response status: ${res.status}`);
      if (!res.ok) {
        let serverMsg = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          serverMsg = body.error ?? body.message ?? serverMsg;
        } catch {
          // body was not JSON
        }
        console.error(`[useDeleteUserFile] Delete failed — ${serverMsg}`);
        throw new Error(serverMsg);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.userFiles.list.path] });
      toast({
        title: "File Deleted",
        description: "The file has been permanently removed.",
      });
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("[useDeleteUserFile] onError:", msg);
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: msg,
      });
    },
  });
}

// ─── Legacy hooks (backward compat — delegate to starter files) ───

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

export function useDeleteFile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.files.delete.path, { id });
      console.log(`[useDeleteFile] Sending DELETE ${url}`);
      const res = await fetch(url, { method: api.files.delete.method });
      console.log(`[useDeleteFile] Response status: ${res.status}`);
      if (!res.ok) {
        let serverMsg = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          serverMsg = body.error ?? body.message ?? serverMsg;
        } catch {
          // body was not JSON
        }
        console.error(`[useDeleteFile] Delete failed — ${serverMsg}`);
        throw new Error(serverMsg);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.files.list.path] });
      toast({
        title: "File Deleted",
        description: "The file has been permanently removed.",
      });
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("[useDeleteFile] onError:", msg);
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: msg,
      });
    },
  });
}
