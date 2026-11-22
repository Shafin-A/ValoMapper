import { Suspense } from "react";
import { RSOCallbackContent } from "@/components/auth/rso-callback-content";
import { getTranslations } from "next-intl/server";

export const generateMetadata = async () => {
  const t = await getTranslations("auth");
  return { title: t("rsoCallbackTitle") };
};

const RSOCallbackPage = async () => {
  const t = await getTranslations("auth");

  return (
    <div className="min-h-screen flex items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 text-center text-card-foreground shadow-sm">
        <Suspense
          fallback={
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">
                {t("rsoProcessingTitle")}
              </h1>
              <p className="text-sm text-foreground/70">
                {t("rsoProcessingDescription")}
              </p>
            </div>
          }
        >
          <RSOCallbackContent />
        </Suspense>
      </div>
    </div>
  );
};

export default RSOCallbackPage;
