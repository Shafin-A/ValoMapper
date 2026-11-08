import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "My Strategies",
  robots: { index: false, follow: false },
};

const StrategiesLayout = ({ children }: { children: ReactNode }) => (
  <>{children}</>
);

export default StrategiesLayout;
