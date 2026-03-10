"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { exchangeCodeForTokens, sanitizeRedirectPath } from "@/lib/rso";
import { toast } from "sonner";

export const RSOCallbackContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loading } = useFirebaseAuth();
  const processedCodeRef = useRef<string | null>(null);
  const [status, setStatus] = useState<
    "loading" | "success" | "error" | "no_code"
  >("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const processCallback = async () => {
      if (loading) {
        return;
      }

      const code = searchParams.get("code");
      const callbackError = searchParams.get("error");
      const redirectTo = sanitizeRedirectPath(searchParams.get("redirect"));

      if (callbackError) {
        setErrorMessage("Riot sign-in session expired. Please try again.");
        setStatus("error");
        return;
      }

      if (!code) {
        setStatus("no_code");
        return;
      }

      if (processedCodeRef.current === code) {
        return;
      }
      processedCodeRef.current = code;

      try {
        const result = await exchangeCodeForTokens(code);
        if (result.customToken) {
          const token = result.customToken;

          await import("firebase/auth").then(
            ({ signInWithCustomToken, getAuth }) =>
              signInWithCustomToken(getAuth(), token),
          );
          toast.success("Logged in with Riot account!");
          setStatus("success");

          setTimeout(() => {
            router.push(redirectTo);
          }, 1000);
        } else {
          throw new Error("No custom token returned");
        }
      } catch (error) {
        console.error("RSO callback error:", error);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to sign in with Riot account",
        );
        setStatus("error");
      }
    };

    processCallback();
  }, [loading, searchParams, router]);

  return (
    <div className="space-y-4 text-center">
      {status === "loading" && (
        <>
          <h1 className="text-2xl font-bold">Signing you in with Riot...</h1>
          <p className="text-muted-foreground">
            Please wait while we complete the login.
          </p>
        </>
      )}

      {status === "success" && (
        <>
          <h1 className="text-2xl font-bold text-green-600">Success!</h1>
          <p className="text-muted-foreground">
            You have been signed in using your Riot account.
          </p>
          <p className="text-sm text-muted-foreground">
            Redirecting you now...
          </p>
        </>
      )}

      {status === "error" && (
        <>
          <h1 className="text-2xl font-bold text-red-600">Error</h1>
          <p className="text-muted-foreground">{errorMessage}</p>
          <button
            onClick={() => router.push("/profile")}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Go to Profile
          </button>
        </>
      )}

      {status === "no_code" && (
        <>
          <h1 className="text-2xl font-bold text-yellow-600">
            No Authorization Code
          </h1>
          <p className="text-muted-foreground">
            It looks like the Riot login was cancelled.
          </p>
          <button
            onClick={() => router.push("/profile")}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Go to Profile
          </button>
        </>
      )}
    </div>
  );
};
