import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";

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

      const response = await fetch(
        `http://localhost:8080/api/strategies/${strategyId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name }),
        }
      );

      if (!response.ok) throw new Error("Failed to update strategy");

      return response.json();
    },
    onSuccess: (data) => {
      toast.success(`Strategy "${data.name}" updated successfully!`);
      queryClient.invalidateQueries({ queryKey: ["folders-and-strategies"] });
    },
    onError: (error) => {
      toast.error(`Failed to update strategy. Error: ${error.message}`);
    },
  });

  return {
    mutate,
    isPending,
    isError,
  };
};
