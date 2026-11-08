import { SignupForm } from "@/components/auth-forms/signup-form";
import { CenteredPageShell } from "@/components/shared/centered-page-shell";

const SignupPage = () => {
  return (
    <CenteredPageShell>
      <SignupForm />
    </CenteredPageShell>
  );
};

export default SignupPage;
