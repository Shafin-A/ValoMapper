import type { Metadata } from "next";
import { ReplaySessionPage } from "./replay-session-page";

export const metadata: Metadata = {
  title: "Replay",
  description:
    "Watch a VALORANT replay round back in real time on the ValoMapper map.",
  robots: { index: false, follow: false },
};

const ReplaySessionRoute = () => {
  return <ReplaySessionPage />;
};

export default ReplaySessionRoute;
