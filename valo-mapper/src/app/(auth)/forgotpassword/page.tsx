import { ForgotPasswordForm } from "@/components/auth-forms/forgot-password-form";
import { CenteredPageShell } from "@/components/shared/centered-page-shell";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("auth");

  return {
    title: t("resetTitle"),
    robots: { index: false, follow: false },
  };
};

const ForgotPasswordPage = () => {
  return (
    <CenteredPageShell showLanguageSwitcher>
      <ForgotPasswordForm />
    </CenteredPageShell>
  );
};

export default ForgotPasswordPage;
