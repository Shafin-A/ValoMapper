"use client";

import { useMutation } from "@tanstack/react-query";
import { useFirebaseAuth } from "../use-firebase-auth";
import { toast } from "sonner";

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

      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      const response = await fetch("/api/users/me", {
        method: "PUT",
        headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to update user");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Profile updated successfully");
    },
    onError: () => {
      toast.error("Failed to update profile");
    },
  });

  return mutation;
};
