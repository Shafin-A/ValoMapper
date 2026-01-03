import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { apiFetch } from "@/lib/api";

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

      return apiFetch<null>(`/api/strategies/${strategyId}`, {
        method: "DELETE",
        token,
      });
    },
    onSuccess: () => {
      toast.success("Strategy deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["folders-and-strategies"] });
    },
    onError: (error) => {
      toast.error(`Failed to delete strategy: ${error.message}`);
    },
  });

  return {
    mutate,
    isPending,
    isError,
  };
};
