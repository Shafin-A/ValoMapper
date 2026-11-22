import { SignupForm } from "@/components/auth-forms/signup-form";
import { CenteredPageShell } from "@/components/shared/centered-page-shell";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("auth");

  return {
    title: t("signUp"),
    robots: { index: false, follow: false },
  };
};

const SignupPage = () => {
  return (
    <CenteredPageShell showLanguageSwitcher>
      <SignupForm />
    </CenteredPageShell>
  );
};

export default SignupPage;
