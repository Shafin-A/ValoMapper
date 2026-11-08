import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "My Matches",
  robots: { index: false, follow: false },
};

const MatchesLayout = ({ children }: { children: ReactNode }) => (
  <>{children}</>
);

export default MatchesLayout;
