import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  const { getIdToken } = useFirebaseAuth();

  const { mutate, isPending, isError } = useMutation({
    mutationFn: async () => {
      const token = await getIdToken();
      if (!token) throw new Error("User not authenticated");

      const response = await fetch(`http://localhost:8080/api/users/me`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to delete user");

      return null;
    },
    onSuccess: async () => {
      toast.success("User deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
    onError: (error) => {
      toast.error(`Failed to delete user. Error: ${error.message}`);
    },
  });

  return {
    mutate,
    isPending,
    isError,
  };
};
