"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { setPendingLobbyToast, PendingLobbyToast } from "@/lib/lobby-creation";
import { CanvasState, Lobby } from "@/lib/types";

export interface CreateLobbyOptions {
  initialCanvasState?: CanvasState;
  pendingToast?: PendingLobbyToast;
}

export const useCreateLobby = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: async (options?: CreateLobbyOptions) => {
      const lobby = await apiFetch<Lobby>("/api/lobbies", { method: "POST" });

      if (options?.initialCanvasState) {
        await apiFetch<Lobby>(`/api/lobbies/${lobby.lobbyCode}`, {
          method: "PATCH",
          body: JSON.stringify({ canvasState: options.initialCanvasState }),
        });
      }

      return lobby;
    },
    onSuccess: (data, options) => {
      setPendingLobbyToast(options?.pendingToast ?? { type: "created" });
      router.push(`/${data.lobbyCode}`);
    },
    onError: (error) => {
      toast.error(`Failed to create lobby: ${error.message}`);
    },
  });
};
