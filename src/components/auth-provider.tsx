"use client";

import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from "firebase/auth";
import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { getFirebaseAuth, googleProvider } from "@/lib/firebase/client";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const e2eMode = process.env.NEXT_PUBLIC_E2E_MODE === "true";
    if (e2eMode) {
      setUser(
        {
          uid: "e2e-user",
          displayName: "E2E User",
          email: "e2e@local.test"
        } as User
      );
      setLoading(false);
      return;
    }

    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signInWithGoogle: async () => {
        if (process.env.NEXT_PUBLIC_E2E_MODE === "true") {
          setUser(
            {
              uid: "e2e-user",
              displayName: "E2E User",
              email: "e2e@local.test"
            } as User
          );
          return;
        }

        const auth = getFirebaseAuth();
        if (!auth) {
          throw new Error("Firebase client configuration is missing in .env.local");
        }
        await signInWithPopup(auth, googleProvider);
      },
      signOutUser: async () => {
        if (process.env.NEXT_PUBLIC_E2E_MODE === "true") {
          setUser(null);
          return;
        }

        const auth = getFirebaseAuth();
        if (!auth) {
          return;
        }
        await signOut(auth);
      }
    }),
    [loading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
