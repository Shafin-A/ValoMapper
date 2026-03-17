import { apiFetchWithAuth, authQueryOptions } from "@/lib/api";
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
    queryFn: () => apiFetchWithAuth<User>("/api/users/me", getIdToken),
    enabled: !!firebaseUser && !authLoading,
    ...authQueryOptions,
  });

  return {
    data,
    isLoading: authLoading || isLoading,
    isError,
    error,
    refetch,
  };
};
