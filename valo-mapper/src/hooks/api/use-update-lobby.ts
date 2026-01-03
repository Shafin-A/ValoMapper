import { CanvasState, Lobby } from "@/lib/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";

export const useUpdateLobby = (lobbyCode: string) => {
  const queryClient = useQueryClient();

  const { mutate, isPending, isError } = useMutation({
    mutationFn: (canvasState: CanvasState) =>
      apiFetch<Lobby>(`/api/lobbies/${lobbyCode}`, {
        method: "PATCH",
        body: JSON.stringify({ canvasState }),
      }),
    onSuccess: () => {
      toast.success("Canvas synced!");
      queryClient.invalidateQueries({ queryKey: ["lobby", lobbyCode] });
    },
    onError: (error) => {
      toast.error(`Failed to sync canvas: ${error.message}`);
    },
  });

  return {
    mutate,
    isPending,
    isError,
  };
};
