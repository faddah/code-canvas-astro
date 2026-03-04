import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useUserProfile(enabled: boolean) {
  return useQuery({
    queryKey: [api.userProfile.get.path],
    enabled,
    queryFn: async () => {
      const res = await fetch(api.userProfile.get.path);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
  });
}

export function useCreateUserProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      phone?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    }) => {
      const res = await fetch(api.userProfile.create.path, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create profile");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.userProfile.get.path] });
      toast({
        title: "Profile Created",
        description: "Your profile has been saved successfully.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save profile. Please try again.",
      });
    },
  });
}

export function useUpdateUserProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      phone?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    }) => {
      const res = await fetch(api.userProfile.update.path, {
        method: 'PUT',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.userProfile.get.path] });
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update profile. Please try again.",
      });
    },
  });
}
