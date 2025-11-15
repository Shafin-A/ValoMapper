import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";

interface DeleteStrategyParams {
  strategyId: number;
}

export const useDeleteStrategy = () => {
  const queryClient = useQueryClient();
  const { getIdToken } = useFirebaseAuth();

  const { mutate, isPending, isError } = useMutation({
    mutationFn: async ({ strategyId }: DeleteStrategyParams) => {
      const token = await getIdToken();
      if (!token) throw new Error("User not authenticated");

      const response = await fetch(
        `http://localhost:8080/api/strategies/${strategyId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to delete strategy");

      return null;
    },
    onSuccess: () => {
      toast.success("Strategy deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["folders-and-strategies"] });
    },
    onError: (error) => {
      toast.error(`Failed to delete strategy. Error: ${error.message}`);
    },
  });

  return {
    mutate,
    isPending,
    isError,
  };
};
