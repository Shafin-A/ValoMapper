"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FirebaseError } from "firebase/app";
import { RiotSignInButton } from "@/components/auth/riot-sign-in-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { sanitizeRedirectPath } from "@/lib/rso";
import { useUser } from "@/hooks/api/use-user";
import { useTranslations } from "next-intl";

export const LoginForm = ({
  className,
  ...props
}: React.ComponentProps<"div">) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const { signIn, logout } = useFirebaseAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    data: user,
    isLoading: isUserLoading,
    isError: isUserError,
    error: userError,
  } = useUser();

  useEffect(() => {
    if (user && !isUserLoading) {
      const redirectTo = sanitizeRedirectPath(searchParams.get("redirect"));
      router.push(redirectTo);
    }
  }, [user, isUserLoading, router, searchParams]);

  useEffect(() => {
    if (isUserError && userError) {
      setError(userError.message);
      setLoading(false);
    }
  }, [isUserError, userError]);

  const rsoClientId = process.env.NEXT_PUBLIC_RSO_CLIENT_ID || "";

  const redirectParam = searchParams.get("redirect") || "/";
  const safeRedirectParam = sanitizeRedirectPath(redirectParam);
  const rsoLink = rsoClientId
    ? `/api/auth/rso/start?redirect=${encodeURIComponent(safeRedirectParam)}`
    : "#";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const firebaseUser = await signIn(email, password);

      if (!firebaseUser.emailVerified) {
        setError(t("verifyEmailFirst"));

        await logout();

        setLoading(false);

        return;
      }

      setLoading(false);
    } catch (err: unknown) {
      if (err instanceof FirebaseError) {
        if (err.code === "auth/invalid-credential") {
          setError(t("invalidCredentials"));
        } else if (err.code === "auth/too-many-requests") {
          setError(t("tooManyLoginAttempts"));
        } else {
          setError(t("loginFailed"));
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t("unexpectedError"));
      }
      setLoading(false);
    }
  };

  return (
    <div className={className} {...props}>
      <Card>
        <CardHeader>
          <CardTitle as="h1">{t("signInTitle")}</CardTitle>
          <CardDescription>{t("signInDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <RiotSignInButton
                  href={rsoLink}
                  disabled={!rsoClientId}
                />
              </Field>
              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                {t("or")}
              </FieldSeparator>
              <Field>
                <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading || isUserLoading}
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
                  <Link
                    href="/forgotpassword"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    {t("forgotPassword")}
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading || isUserLoading}
                />
              </Field>
              <Field>
                <Button type="submit" disabled={loading || isUserLoading}>
                  {loading || isUserLoading ? t("loggingIn") : t("login")}
                </Button>

                {error && (
                  <div role="alert" className="text-sm text-destructive">
                    {error}
                  </div>
                )}

                <FieldDescription className="text-center">
                  {t("noAccount")} <Link href="/signup">{t("signUp")}</Link>
                </FieldDescription>

                <FieldDescription className="mt-2 text-center text-xs text-muted-foreground">
                  <Link
                    href="/terms-of-service"
                    className="underline underline-offset-4"
                  >
                    {tc("termsOfService")}
                  </Link>{" "}
                  ·{" "}
                  <Link
                    href="/privacy-policy"
                    className="underline underline-offset-4"
                  >
                    {tc("privacyPolicy")}
                  </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
