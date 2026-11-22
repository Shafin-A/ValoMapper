import { queryKeys } from "@/lib/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { apiFetchWithAuth } from "@/lib/api";
import { useTranslations } from "next-intl";

interface DeleteFolderParams {
  folderId: number;
}

export const useDeleteFolder = () => {
  const queryClient = useQueryClient();
  const { getIdToken } = useFirebaseAuth();
  const t = useTranslations("toasts");

  const { mutate, isPending, isError } = useMutation({
    mutationFn: ({ folderId }: DeleteFolderParams) =>
      apiFetchWithAuth<null>(`/api/folders/${folderId}`, getIdToken, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast.success(t("folderDeleted"));
      queryClient.invalidateQueries({ queryKey: queryKeys.folders });
    },
    onError: (error) => {
      toast.error(t("failed", { error: error.message }));
    },
  });

  return {
    mutate,
    isPending,
    isError,
  };
};
