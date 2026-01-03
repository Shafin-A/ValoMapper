import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { apiFetch } from "@/lib/api";

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  const { getIdToken } = useFirebaseAuth();

  const { mutate, isPending, isError } = useMutation({
    mutationFn: async () => {
      const token = await getIdToken();
      if (!token) throw new Error("User not authenticated");

      return apiFetch<null>("/api/users/me", {
        method: "DELETE",
        token,
      });
    },
    onSuccess: async () => {
      toast.success("User deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
    onError: (error) => {
      toast.error(`Failed to delete user: ${error.message}`);
    },
  });

  return {
    mutate,
    isPending,
    isError,
  };
};
