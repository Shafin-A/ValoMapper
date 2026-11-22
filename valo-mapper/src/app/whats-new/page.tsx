import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { WhatsNewPage } from "./whats-new-page";

export const generateMetadata = async (): Promise<Metadata> => {
  const nav = await getTranslations("nav");
  const t = await getTranslations("whatsNew");

  return {
    title: nav("whatsNew"),
    description: t("description"),
  };
};

const Page = () => {
  return <WhatsNewPage />;
};

export default Page;
