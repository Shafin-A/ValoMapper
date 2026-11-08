import { ForgotPasswordForm } from "@/components/auth-forms/forgot-password-form";
import { CenteredPageShell } from "@/components/shared/centered-page-shell";

const ForgotPasswordPage = () => {
  return (
    <CenteredPageShell>
      <ForgotPasswordForm />
    </CenteredPageShell>
  );
};

export default ForgotPasswordPage;
