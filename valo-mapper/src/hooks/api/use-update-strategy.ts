import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { apiFetchWithAuth } from "@/lib/api";
import { Strategy } from "@/lib/types";

interface UpdateStrategyParams {
  strategyId: number;
  name?: string;
  folderId?: number | null;
  includeFolderId?: boolean;
}

export const useUpdateStrategy = () => {
  const queryClient = useQueryClient();
  const { getIdToken } = useFirebaseAuth();

  const { mutate, isPending, isError } = useMutation({
    mutationFn: ({
      strategyId,
      name,
      folderId,
      includeFolderId = false,
    }: UpdateStrategyParams) => {
      const payload: { name?: string; folderId?: number | null } = {};

      if (typeof name === "string") {
        payload.name = name;
      }

      if (includeFolderId) {
        payload.folderId = folderId ?? null;
      }

      return apiFetchWithAuth<Strategy>(
        `/api/strategies/${strategyId}`,
        getIdToken,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      );
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
