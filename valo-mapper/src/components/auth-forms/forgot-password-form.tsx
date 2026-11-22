"use client";

import { useState } from "react";
import { FirebaseError } from "firebase/app";
import { sendPasswordResetEmail } from "firebase/auth";
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
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { useTranslations } from "next-intl";

export const ForgotPasswordForm = ({
  className,
  ...props
}: React.ComponentProps<"div">) => {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
    } catch (err) {
      if (err instanceof FirebaseError) {
        if (err.code === "auth/too-many-requests") {
          setError(t("tooManyRequests"));
        } else {
          setError(t("resetFailed"));
        }
      } else {
        setError(t("unexpectedError"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className} {...props}>
      <Card>
        <CardHeader>
          <CardTitle as="h1">{t("resetTitle")}</CardTitle>
          <CardDescription>{t("resetDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
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
                  disabled={loading || success}
                />
              </Field>
              <Field>
                <Button type="submit" disabled={loading || success}>
                  {loading ? t("sending") : t("sendResetLink")}
                </Button>

                {error && (
                  <div role="alert" className="text-sm text-destructive">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="text-sm text-accent">{t("resetSent")}</div>
                )}

                <FieldDescription className="text-center">
                  {t("rememberPassword")}{" "}
                  <Link href="/login">{t("backToLogin")}</Link>
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
