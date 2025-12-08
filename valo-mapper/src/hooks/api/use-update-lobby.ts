import { CanvasState } from "@/lib/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const useUpdateLobby = (lobbyCode: string) => {
  const queryClient = useQueryClient();

  const { mutate, isPending, isError } = useMutation({
    mutationFn: async (canvasState: CanvasState) => {
      const response = await fetch(`/api/lobbies/${lobbyCode}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ canvasState }),
      });

      if (!response.ok) {
        throw new Error("Failed to update lobby");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Canvas synced!");
      queryClient.invalidateQueries({ queryKey: ["lobby", lobbyCode] });
    },
    onError: (error) => {
      toast.error(`Failed to sync canvas. Error: ${error.message}`);
    },
  });

  return {
    mutate,
    isPending,
    isError,
  };
};
