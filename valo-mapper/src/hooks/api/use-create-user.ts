import { useMutation } from "@tanstack/react-query";

interface CreateUserParams {
  idToken: string;
  firebaseUid: string;
  name: string;
  email: string;
}

export const useCreateUser = () => {
  return useMutation({
    mutationFn: async ({
      idToken,
      firebaseUid,
      name,
      email,
    }: CreateUserParams) => {
      const response = await fetch("http://localhost:8080/api/users", {
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
  });
};
