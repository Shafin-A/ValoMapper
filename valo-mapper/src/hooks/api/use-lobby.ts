import { Lobby } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";

export const useLobby = (lobbyCode: string) => {
  const { data, isLoading, isError, error } = useQuery<Lobby>({
    queryKey: ["lobby", lobbyCode],
    queryFn: async () => {
      const response = await fetch(`/api/lobbies/${lobbyCode}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Lobby not found");
        }
        throw new Error("Failed to fetch lobby");
      }
      return response.json();
    },
    enabled: !!lobbyCode,
  });

  return {
    data,
    isLoading,
    isError,
    error,
  };
};
