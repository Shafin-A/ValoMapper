import { auth } from "@/lib/firebase";
import { useQueryClient } from "@tanstack/react-query";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";
import { useEffect, useState } from "react";

export const useFirebaseAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      if (firebaseUser) {
        queryClient.invalidateQueries({ queryKey: ["user"] });
        queryClient.invalidateQueries({ queryKey: ["folders-and-strategies"] });
      } else {
        queryClient.removeQueries({ queryKey: ["user"] });
        queryClient.removeQueries({ queryKey: ["folders-and-strategies"] });
      }
    });

    return unsubscribe;
  }, [queryClient]);

  const getIdToken = async () => {
    if (user) {
      const token = await user.getIdToken();
      return token;
    }

    return null;
  };

  const signIn = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );

    return userCredential.user;
  };

  const signUp = async (email: string, password: string) => {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );

    return userCredential.user;
  };

  const logout = async () => {
    await signOut(auth);
    queryClient.removeQueries({ queryKey: ["user"] });
    queryClient.removeQueries({ queryKey: ["folders-and-strategies"] });
  };

  return { user, loading, signIn, signUp, logout, getIdToken };
};
