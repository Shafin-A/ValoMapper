import { User } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { useFirebaseAuth } from "../use-firebase-auth";

export const useUser = () => {
  const { getIdToken, user: firebaseUser } = useFirebaseAuth();
  const {
    data: user,
    isLoading,
    isError,
    error,
  } = useQuery<User>({
    queryKey: ["user"],
    queryFn: async () => {
      const idToken = await getIdToken();

      if (!idToken) {
        throw new Error("User not authenticated");
      }

      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      };

      const response = await fetch(`http://localhost:8080/api/users/me`, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        throw new Error("Failed to fetch user");
      }

      return response.json();
    },
    enabled: !!firebaseUser,
  });

  return {
    user,
    isLoading,
    isError,
    error,
  };
};
