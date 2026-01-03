"use client";

import { useMutation } from "@tanstack/react-query";
import { useFirebaseAuth } from "../use-firebase-auth";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { User } from "@/lib/types";

interface UpdateUserData {
  name?: string;
  tourCompleted?: boolean;
}

export const useUpdateUser = () => {
  const { getIdToken } = useFirebaseAuth();

  const mutation = useMutation({
    mutationFn: async (data: UpdateUserData) => {
      const token = await getIdToken();
      if (!token) throw new Error("User not authenticated");

      return apiFetch<User>("/api/users/me", {
        method: "PUT",
        token,
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast.success("Profile updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update profile: ${error.message}`);
    },
  });

  return mutation;
};
