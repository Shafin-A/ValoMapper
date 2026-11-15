import { queryKeys } from "@/lib/query-keys";
import { CanvasState, Lobby } from "@/lib/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, apiFetch } from "@/lib/api";

export const useUpdateLobby = (lobbyCode: string) => {
  const queryClient = useQueryClient();

  const { mutateAsync, isPending, isError } = useMutation({
    mutationFn: (canvasState: CanvasState) =>
      apiFetch<Lobby>(`/api/lobbies/${lobbyCode}`, {
        method: "PATCH",
        body: JSON.stringify({ canvasState }),
      }),
    // A concurrent canvas write answers 409; one retry clears it.
    retry: (failureCount, error) =>
      failureCount < 1 && error instanceof ApiError && error.status === 409,
    retryDelay: 500,
    onSuccess: (data) => {
      if (lobbyCode) {
        queryClient.setQueryData(queryKeys.lobby(lobbyCode), data);
      }
    },
    onError: (error) => {
      toast.error(`Failed to sync canvas: ${error.message}`);
    },
  });

  return {
    mutateAsync,
    isPending,
    isError,
  };
};
