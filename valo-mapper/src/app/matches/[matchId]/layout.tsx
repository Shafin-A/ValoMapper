import { CanvasProviders } from "@/components/providers/canvas-providers";
import type { ReactNode } from "react";

const MatchReviewLayout = ({ children }: { children: ReactNode }) => {
  return <CanvasProviders>{children}</CanvasProviders>;
};

export default MatchReviewLayout;
