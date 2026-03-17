import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { apiFetchWithAuth } from "@/lib/api";

interface DeleteStrategyParams {
  strategyId: number;
}

export const useDeleteStrategy = () => {
  const queryClient = useQueryClient();
  const { getIdToken } = useFirebaseAuth();

  const { mutate, isPending, isError } = useMutation({
    mutationFn: ({ strategyId }: DeleteStrategyParams) =>
      apiFetchWithAuth<null>(`/api/strategies/${strategyId}`, getIdToken, {
        method: "DELETE",
      }),
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
