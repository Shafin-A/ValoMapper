import { PrivacyPolicy } from "@/components/legal/privacy-policy";

export const metadata = {
  title: "Privacy Policy | ValoMapper",
  description: "Privacy Policy for ValoMapper",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <PrivacyPolicy />
      </div>
    </div>
  );
}
