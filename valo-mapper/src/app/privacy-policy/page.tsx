import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { PrivacyPolicy } from "@/components/legal/privacy-policy";
import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "Privacy Policy | ValoMapper",
  description: "Privacy Policy for ValoMapper",
};

export default async function PrivacyPolicyPage() {
  const t = await getTranslations("legal");

  return (
    <LegalPageShell title={t("privacyTitle")}>
      <PrivacyPolicy />
    </LegalPageShell>
  );
}
