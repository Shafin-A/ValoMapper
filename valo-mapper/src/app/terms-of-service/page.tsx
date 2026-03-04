import { TermsOfService } from "@/components/legal/terms-of-service";

export const metadata = {
  title: "Terms of Service | ValoMapper",
  description: "Terms of Service for ValoMapper",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <TermsOfService />
      </div>
    </div>
  );
}
