import type { Metadata } from "next";
import MatchReviewPage from "./match-review-page";

export const metadata: Metadata = {
  title: "Match Review",
  robots: { index: false, follow: false },
};

const MatchPage = () => {
  return <MatchReviewPage />;
};

export default MatchPage;
