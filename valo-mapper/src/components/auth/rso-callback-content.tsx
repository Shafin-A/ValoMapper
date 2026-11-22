"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { exchangeCodeForTokens, sanitizeRedirectPath } from "@/lib/rso";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export const RSOCallbackContent = () => {
  const t = useTranslations("auth");
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
        setErrorMessage(t("rsoSessionExpired"));
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
          toast.success(t("rsoSuccessToast"));
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
          error instanceof Error ? error.message : t("rsoFailed"),
        );
        setStatus("error");
      }
    };

    processCallback();
  }, [loading, searchParams, router, t]);

  return (
    <div className="space-y-4 text-center">
      {status === "loading" && (
        <>
          <h1 className="text-2xl font-bold">{t("rsoLoadingTitle")}</h1>
          <p className="text-foreground/75">{t("rsoLoadingDescription")}</p>
        </>
      )}

      {status === "success" && (
        <>
          <h1 className="text-2xl font-bold text-green-600">
            {t("rsoSuccessTitle")}
          </h1>
          <p className="text-foreground/75">{t("rsoSuccessDescription")}</p>
          <p className="text-sm text-foreground/65">{t("rsoRedirecting")}</p>
        </>
      )}

      {status === "error" && (
        <>
          <h1 className="text-2xl font-bold text-red-600">
            {t("rsoErrorTitle")}
          </h1>
          <p className="text-foreground/75">{errorMessage}</p>
          <button
            onClick={() => router.push("/profile")}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            {t("goToProfile")}
          </button>
        </>
      )}

      {status === "no_code" && (
        <>
          <h1 className="text-2xl font-bold text-yellow-600">
            {t("rsoNoCodeTitle")}
          </h1>
          <p className="text-foreground/75">{t("rsoNoCodeDescription")}</p>
          <button
            onClick={() => router.push("/profile")}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            {t("goToProfile")}
          </button>
        </>
      )}
    </div>
  );
};
