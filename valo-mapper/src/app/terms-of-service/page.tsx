import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { TermsOfService } from "@/components/legal/terms-of-service";

export const metadata = {
  title: "Terms of Service | ValoMapper",
  description: "Terms of Service for ValoMapper",
};

export default function TermsOfServicePage() {
  return (
    <LegalPageShell title="Terms of Service">
      <TermsOfService />
    </LegalPageShell>
  );
}
