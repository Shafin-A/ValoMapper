import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { TermsOfService } from "@/components/legal/terms-of-service";
import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "Terms of Service | ValoMapper",
  description: "Terms of Service for ValoMapper",
};

export default async function TermsOfServicePage() {
  const t = await getTranslations("legal");

  return (
    <LegalPageShell title={t("termsTitle")}>
      <TermsOfService />
    </LegalPageShell>
  );
}
