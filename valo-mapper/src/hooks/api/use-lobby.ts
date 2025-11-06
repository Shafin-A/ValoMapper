import { CanvasState, Lobby } from "@/lib/types";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export const useLobby = (lobbyCode: string) => {
  const { data: lobby, refetch } = useQuery<Lobby>({
    queryKey: ["lobby", lobbyCode],
    queryFn: async () => {
      const response = await fetch(
        `http://localhost:8080/api/lobbies/${lobbyCode}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch lobby");
      }
      return response.json();
    },
    enabled: !!lobbyCode,
  });

  const {
    mutate: updateLobby,
    isPending: isUpdatingLobby,
    isError: isErrorUpdatingLobby,
  } = useMutation({
    mutationFn: async (canvasState: CanvasState) => {
      const response = await fetch(
        `http://localhost:8080/api/lobbies/${lobbyCode}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ canvasState }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update lobby");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Canvas synced!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to sync canvas. Error: ${error.message}`);
    },
  });

  return {
    lobby,
    updateLobby,
    isUpdatingLobby,
    isErrorUpdatingLobby,
  };
};
