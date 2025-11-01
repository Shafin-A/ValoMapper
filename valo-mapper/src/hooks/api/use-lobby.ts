import { CanvasState } from "@/lib/types";
import { useMutation, useQuery } from "@tanstack/react-query";

type Lobby = {
  lobbyCode: string;
  createdAt: string;
  canvasState: CanvasState | null;
};

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

  const { mutate: updateLobby } = useMutation({
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
      refetch();
    },
  });

  return {
    lobby,
    updateLobby,
  };
};
