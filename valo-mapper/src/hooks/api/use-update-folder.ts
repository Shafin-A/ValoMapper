import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { apiFetch } from "@/lib/api";
import { Folder } from "@/lib/types";

interface UpdateFolderParams {
  folderId: number;
  name: string;
}

export const useUpdateFolder = () => {
  const queryClient = useQueryClient();
  const { getIdToken } = useFirebaseAuth();

  const { mutate, isPending, isError } = useMutation({
    mutationFn: async ({ folderId, name }: UpdateFolderParams) => {
      const token = await getIdToken();
      if (!token) throw new Error("User not authenticated");

      return apiFetch<Folder>(`/api/folders/${folderId}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ name }),
      });
    },
    onSuccess: (data) => {
      toast.success(`Folder "${data.name}" updated successfully!`);
      queryClient.invalidateQueries({ queryKey: ["folders-and-strategies"] });
    },
    onError: (error) => {
      toast.error(`Failed to update folder: ${error.message}`);
    },
  });

  return {
    mutate,
    isPending,
    isError,
  };
};
