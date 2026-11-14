import type { Metadata } from "next";
import { WhatsNewPage } from "./whats-new-page";

export const metadata: Metadata = {
  title: "What's New",
  description:
    "See the latest ValoMapper updates: replay playback, notes on the board, multi-select, rich text, board backgrounds, and the mobile makeover.",
};

const Page = () => {
  return <WhatsNewPage />;
};

export default Page;
