import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { apiFetch } from "@/lib/api";

interface DeleteFolderParams {
  folderId: number;
}

export const useDeleteFolder = () => {
  const queryClient = useQueryClient();
  const { getIdToken } = useFirebaseAuth();

  const { mutate, isPending, isError } = useMutation({
    mutationFn: async ({ folderId }: DeleteFolderParams) => {
      const token = await getIdToken();
      if (!token) throw new Error("User not authenticated");

      return apiFetch<null>(`/api/folders/${folderId}`, {
        method: "DELETE",
        token,
      });
    },
    onSuccess: () => {
      toast.success("Folder deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["folders-and-strategies"] });
    },
    onError: (error) => {
      toast.error(`Failed to delete folder: ${error.message}`);
    },
  });

  return {
    mutate,
    isPending,
    isError,
  };
};
