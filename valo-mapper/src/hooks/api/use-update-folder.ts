import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";

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

      const response = await fetch(`/api/folders/${folderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) throw new Error("Failed to update folder");

      return response.json();
    },
    onSuccess: (data) => {
      toast.success(`Folder "${data.name}" updated successfully!`);
      queryClient.invalidateQueries({ queryKey: ["folders-and-strategies"] });
    },
    onError: (error) => {
      toast.error(`Failed to update folder. Error: ${error.message}`);
    },
  });

  return {
    mutate,
    isPending,
    isError,
  };
};
