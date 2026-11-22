import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ReplayEntryPage } from "./replay-entry-page";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("replay.entry");

  return {
    title: t("badge"),
    description: t("description"),
  };
};

const ReplayPage = () => {
  return <ReplayEntryPage />;
};

export default ReplayPage;
