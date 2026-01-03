import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { apiFetch } from "@/lib/api";
import { Strategy } from "@/lib/types";

interface UpdateStrategyParams {
  strategyId: number;
  name: string;
}

export const useUpdateStrategy = () => {
  const queryClient = useQueryClient();
  const { getIdToken } = useFirebaseAuth();

  const { mutate, isPending, isError } = useMutation({
    mutationFn: async ({ strategyId, name }: UpdateStrategyParams) => {
      const token = await getIdToken();
      if (!token) throw new Error("User not authenticated");

      return apiFetch<Strategy>(`/api/strategies/${strategyId}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ name }),
      });
    },
    onSuccess: (data) => {
      toast.success(`Strategy "${data.name}" updated successfully!`);
      queryClient.invalidateQueries({ queryKey: ["folders-and-strategies"] });
    },
    onError: (error) => {
      toast.error(`Failed to update strategy: ${error.message}`);
    },
  });

  return {
    mutate,
    isPending,
    isError,
  };
};
