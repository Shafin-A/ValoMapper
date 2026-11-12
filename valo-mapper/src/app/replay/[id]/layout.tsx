import { CanvasProviders } from "@/components/providers/canvas-providers";
import type { ReactNode } from "react";

const ReplaySessionLayout = ({ children }: { children: ReactNode }) => {
  return <CanvasProviders>{children}</CanvasProviders>;
};

export default ReplaySessionLayout;
