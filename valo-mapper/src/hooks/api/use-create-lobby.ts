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
      return apiFetch<Lobby>("/api/lobbies", {
        method: "POST",
        ...(options?.initialCanvasState
          ? {
              body: JSON.stringify({
                canvasState: options.initialCanvasState,
              }),
            }
          : {}),
      });
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
