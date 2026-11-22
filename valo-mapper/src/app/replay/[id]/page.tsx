import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ReplaySessionPage } from "./replay-session-page";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("replay.entry");

  return {
    title: t("badge"),
    description: t("description"),
    robots: { index: false, follow: false },
  };
};

const ReplaySessionRoute = () => {
  return <ReplaySessionPage />;
};

export default ReplaySessionRoute;
