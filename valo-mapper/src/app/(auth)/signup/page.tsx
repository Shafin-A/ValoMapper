import { SignupForm } from "@/components/auth-forms/signup-form";
import { CenteredPageShell } from "@/components/shared/centered-page-shell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign up",
  robots: { index: false, follow: false },
};

const SignupPage = () => {
  return (
    <CenteredPageShell>
      <SignupForm />
    </CenteredPageShell>
  );
};

export default SignupPage;
