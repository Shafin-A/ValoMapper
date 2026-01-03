import { User } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { useFirebaseAuth } from "../use-firebase-auth";

export const useUser = () => {
  const {
    getIdToken,
    user: firebaseUser,
    loading: authLoading,
  } = useFirebaseAuth();

  const { data, isLoading, isError, error, refetch } = useQuery<User>({
    queryKey: ["user"],
    queryFn: async () => {
      const idToken = await getIdToken();

      if (!idToken) {
        throw new Error("No ID token available");
      }

      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      };

      const response = await fetch("/api/users/me", {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        throw new Error("Failed to fetch user");
      }

      return response.json();
    },
    enabled: !!firebaseUser && !authLoading,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000),
  });

  return {
    data,
    isLoading: authLoading || isLoading,
    isError,
    error,
    refetch,
  };
};
