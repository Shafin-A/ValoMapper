import type { CanvasState } from "./canvas";

export type Lobby = {
  lobbyCode: string;
  createdAt: Date;
  canvasState: CanvasState | null;
  updatedAt: Date;
};
