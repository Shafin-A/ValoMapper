import { apiFetch, DEFAULT_RETRY_CONFIG } from "@/lib/api";
import { Lobby } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";

export const useLobby = (lobbyCode: string) => {
  const { data, isLoading, isError, error } = useQuery<Lobby>({
    queryKey: ["lobby", lobbyCode],
    queryFn: () => apiFetch<Lobby>(`/api/lobbies/${lobbyCode}`),
    enabled: !!lobbyCode,
    ...DEFAULT_RETRY_CONFIG,
  });

  return {
    data,
    isLoading,
    isError,
    error,
  };
};
