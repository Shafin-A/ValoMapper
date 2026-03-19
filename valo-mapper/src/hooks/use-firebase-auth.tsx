"use client";

import { auth } from "@/lib/firebase";
import { useQueryClient } from "@tanstack/react-query";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

interface FirebaseAuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const FirebaseAuthContext = createContext<FirebaseAuthContextValue | undefined>(
  undefined,
);

export const FirebaseAuthProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
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

  const getIdToken = useCallback(async () => {
    if (user) {
      const token = await user.getIdToken();
      return token;
    }

    return null;
  }, [user]);

  const signIn = useCallback(async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );

    return userCredential.user;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );

    return userCredential.user;
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    queryClient.removeQueries({ queryKey: ["user"] });
    queryClient.removeQueries({ queryKey: ["folders-and-strategies"] });
  }, [queryClient]);

  const value = useMemo<FirebaseAuthContextValue>(
    () => ({
      user,
      loading,
      signIn,
      signUp,
      logout,
      getIdToken,
    }),
    [user, loading, signIn, signUp, logout, getIdToken],
  );

  return (
    <FirebaseAuthContext.Provider value={value}>
      {children}
    </FirebaseAuthContext.Provider>
  );
};

export const useFirebaseAuth = () => {
  const context = useContext(FirebaseAuthContext);

  if (!context) {
    throw new Error(
      "useFirebaseAuth must be used within a FirebaseAuthProvider",
    );
  }

  return context;
};
