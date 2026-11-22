"use client";

import { useMutation } from "@tanstack/react-query";
import { useFirebaseAuth } from "../use-firebase-auth";
import { toast } from "sonner";
import { apiFetchWithAuth } from "@/lib/api";
import { useTranslations } from "next-intl";
import { User } from "@/lib/types";

interface UpdateUserData {
  name?: string;
  tourCompleted?: boolean;
}

export const useUpdateUser = () => {
  const { getIdToken } = useFirebaseAuth();
  const t = useTranslations("toasts");

  const mutation = useMutation({
    mutationFn: (data: UpdateUserData) =>
      apiFetchWithAuth<User>("/api/users/me", getIdToken, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast.success(t("profileUpdated"));
    },
    onError: (error) => {
      toast.error(t("failed", { error: error.message }));
    },
  });

  return mutation;
};
