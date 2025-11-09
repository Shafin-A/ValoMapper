import { User } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";

interface FetchUserParams {
  idToken: string;
}

export const useUser = ({ idToken }: FetchUserParams) => {
  const {
    data: user,
    isLoading,
    isError,
    error,
  } = useQuery<User>({
    queryKey: ["user"],
    queryFn: async () => {
      const response = await fetch(`http://localhost:8080/api/users/me`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch user");
      }

      return response.json();
    },
    enabled: !!idToken,
  });

  return {
    user,
    isLoading,
    isError,
    error,
  };
};
