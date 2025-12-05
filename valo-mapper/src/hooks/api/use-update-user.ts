"use client";

import { useMutation } from "@tanstack/react-query";
import { useFirebaseAuth } from "../use-firebase-auth";

interface UpdateUserData {
  name: string;
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

      const response = await fetch(`http://localhost:8080/api/users/me`, {
        method: "PUT",
        headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to update user");
      }

      return response.json();
    },
  });

  return mutation;
};
