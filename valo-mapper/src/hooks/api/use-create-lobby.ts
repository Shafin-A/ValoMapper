"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { Lobby } from "@/lib/types";

export const useCreateLobby = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: () => apiFetch<Lobby>("/api/lobbies", { method: "POST" }),
    onSuccess: (data) => {
      router.push(`/${data.lobbyCode}`);
      sessionStorage.setItem("showCreatedToast", "true");
    },
    onError: (error) => {
      toast.error(`Failed to create lobby: ${error.message}`);
    },
  });
};
