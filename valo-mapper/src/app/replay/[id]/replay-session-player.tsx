"use client";

import { CanvasProviders } from "@/components/providers/canvas-providers";
import { ReplayPlayer } from "@/components/replay/replay-player";
import type { ReplayMatch } from "@/lib/replay/types";

export const ReplaySessionPlayer = ({
  match,
  replayId,
}: {
  match: ReplayMatch;
  replayId: string;
}) => {
  return (
    <CanvasProviders>
      <ReplayPlayer match={match} replayId={replayId} />
    </CanvasProviders>
  );
};
