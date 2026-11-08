import { ForgotPasswordForm } from "@/components/auth-forms/forgot-password-form";
import { CenteredPageShell } from "@/components/shared/centered-page-shell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset password",
  robots: { index: false, follow: false },
};

const ForgotPasswordPage = () => {
  return (
    <CenteredPageShell>
      <ForgotPasswordForm />
    </CenteredPageShell>
  );
};

export default ForgotPasswordPage;
