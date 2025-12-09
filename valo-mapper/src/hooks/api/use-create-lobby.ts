"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export const useCreateLobby = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/lobbies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) throw new Error("Failed to create lobby");

      return response.json();
    },
    onSuccess: (data) => {
      router.push(`/${data.lobbyCode}`);
      sessionStorage.setItem("showCreatedToast", "true");
    },
    onError: (error) => {
      toast.error(`Failed to create lobby. Error: ${error.message}`);
    },
  });
};
