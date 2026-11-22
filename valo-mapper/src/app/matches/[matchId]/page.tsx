import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import MatchReviewPage from "./match-review-page";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("matchReview");

  return {
    title: t("metaTitle"),
    robots: { index: false, follow: false },
  };
};

const MatchPage = () => {
  return <MatchReviewPage />;
};

export default MatchPage;
