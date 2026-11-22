"use client";

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
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import Link from "next/link";
import { useState } from "react";
import { FirebaseError } from "@firebase/util";
import { sendEmailVerification } from "firebase/auth";
import { toast } from "sonner";
import { useCreateUser } from "@/hooks/api/use-create-user";
import { useTranslations } from "next-intl";

export const SignupForm = ({ ...props }: React.ComponentProps<typeof Card>) => {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const { signUp, logout } = useFirebaseAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const createUserMutation = useCreateUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("passwordsDoNotMatch"));
      return;
    }

    setLoading(true);

    try {
      const user = await signUp(email, password);
      const idToken = await user.getIdToken();

      await createUserMutation.mutateAsync({
        idToken,
        firebaseUid: user.uid,
        name,
        email,
      });

      await sendEmailVerification(user);

      await logout();

      setError("");

      toast.success(t("signUpSuccess"));
    } catch (err) {
      if (err instanceof FirebaseError) {
        if (err.code === "auth/email-already-in-use") {
          setError(t("emailInUse"));
        } else if (err.code === "auth/invalid-email") {
          setError(t("invalidEmail"));
        } else if (err.code === "auth/weak-password") {
          setError(t("weakPassword"));
        } else {
          setError(t("createAccountFailed"));
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t("unexpectedError"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle as="h1">{t("createAccountTitle")}</CardTitle>
        <CardDescription>{t("createAccountDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">{t("name")}</FieldLabel>
              <Input
                id="name"
                type="text"
                placeholder={t("namePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading || createUserMutation.isPending}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
              <Input
                id="email"
                type="email"
                dir="ltr"
                autoComplete="email"
                placeholder={t("emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading || createUserMutation.isPending}
              />
              <FieldDescription>{t("emailHelp")}</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
              <Input
                id="password"
                type="password"
                dir="ltr"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading || createUserMutation.isPending}
              />
              <FieldDescription>{t("passwordHelp")}</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm-password">
                {t("confirmPassword")}
              </FieldLabel>
              <Input
                id="confirm-password"
                type="password"
                dir="ltr"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading || createUserMutation.isPending}
              />
              <FieldDescription>{t("confirmPasswordHelp")}</FieldDescription>
            </Field>
            <FieldGroup>
              <Field>
                <Button
                  type="submit"
                  disabled={loading || createUserMutation.isPending}
                >
                  {loading || createUserMutation.isPending
                    ? t("creatingAccount")
                    : t("createAccount")}
                </Button>

                {error && (
                  <div role="alert" className="text-sm text-destructive">
                    {error}
                  </div>
                )}

                <FieldDescription className="px-6 text-center">
                  {t("alreadyHaveAccount")}{" "}
                  <Link href="/login">{t("login")}</Link>
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
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
};
