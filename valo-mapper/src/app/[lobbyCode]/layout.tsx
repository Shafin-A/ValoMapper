import { CanvasProviders } from "@/components/providers/canvas-providers";
import type { ReactNode } from "react";

const LobbyLayout = ({ children }: { children: ReactNode }) => {
  return <CanvasProviders>{children}</CanvasProviders>;
};

export default LobbyLayout;
