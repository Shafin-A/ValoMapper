import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { User } from "@/lib/types";

interface CreateUserParams {
  idToken: string;
  firebaseUid: string;
  name: string;
  email: string;
}

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      idToken,
      firebaseUid,
      name,
      email,
    }: CreateUserParams) =>
      apiFetch<User>("/api/users", {
        method: "POST",
        token: idToken,
        body: JSON.stringify({ firebaseUid, name, email }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
};
