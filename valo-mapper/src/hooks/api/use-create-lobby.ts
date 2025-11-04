"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

export const useCreateLobby = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch("http://localhost:8080/api/lobbies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) throw new Error("Failed to create lobby");

      return response.json();
    },
    onSuccess: (data) => {
      router.push(`/${data.lobbyCode}?created=true`);
    },
    onError: (error) => {
      console.error("Failed to create lobby:", error);
    },
  });
};
