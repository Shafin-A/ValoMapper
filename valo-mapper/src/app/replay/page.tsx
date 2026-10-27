import type { Metadata } from "next";
import { ReplayEntryPage } from "./replay-entry-page";

export const metadata: Metadata = {
  title: "Replay",
  description:
    "Play back VALORANT replay files on the map, review every round in real time, and copy any moment into an editable strategy lobby.",
};

const ReplayPage = () => {
  return <ReplayEntryPage />;
};

export default ReplayPage;
