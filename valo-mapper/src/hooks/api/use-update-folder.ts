import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { apiFetchWithAuth } from "@/lib/api";
import { Folder } from "@/lib/types";

interface UpdateFolderParams {
  folderId: number;
  name: string;
}

export const useUpdateFolder = () => {
  const queryClient = useQueryClient();
  const { getIdToken } = useFirebaseAuth();

  const { mutate, isPending, isError } = useMutation({
    mutationFn: ({ folderId, name }: UpdateFolderParams) =>
      apiFetchWithAuth<Folder>(`/api/folders/${folderId}`, getIdToken, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      }),
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
