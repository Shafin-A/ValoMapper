import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { PrivacyPolicy } from "@/components/legal/privacy-policy";

export const metadata = {
  title: "Privacy Policy | ValoMapper",
  description: "Privacy Policy for ValoMapper",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell title="Privacy Policy">
      <PrivacyPolicy />
    </LegalPageShell>
  );
}
