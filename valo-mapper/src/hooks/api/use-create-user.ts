import { useMutation, useQueryClient } from "@tanstack/react-query";

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
    }: CreateUserParams) => {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          firebaseUid,
          name,
          email,
        }),
      });

      if (!response.ok) throw new Error("Failed to create user");

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
};
