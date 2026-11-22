import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("nav");

  return {
    title: {
      default: t("myMatches"),
      template: "%s | ValoMapper",
    },
    robots: { index: false, follow: false },
  };
};

const MatchesLayout = ({ children }: { children: ReactNode }) => (
  <>{children}</>
);

export default MatchesLayout;
