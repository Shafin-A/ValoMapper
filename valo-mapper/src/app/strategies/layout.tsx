import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("nav");

  return {
    title: {
      default: t("myStrategies"),
      template: "%s | ValoMapper",
    },
    robots: { index: false, follow: false },
  };
};

const StrategiesLayout = ({ children }: { children: ReactNode }) => (
  <>{children}</>
);

export default StrategiesLayout;
