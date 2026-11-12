"use client";

import { MatchEventLog } from "@/components/matches/match-event-log";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { useReplayClockStep } from "@/hooks/use-replay-clock";
import { SIDEBAR_WIDTH } from "@/lib/consts";
import type { ReplayClock } from "@/lib/replay/clock";
import { getActiveEventIndex } from "@/lib/replay/frames";
import type { ReplayRound } from "@/lib/replay/types";
import type { MatchPlayers } from "@/lib/matches";
import { memo, useMemo } from "react";
import { ReplayScoreHeader, ReplayScoreboard } from "./replay-scoreboard";
import { ReplayWarningsBanner } from "./replay-warnings-banner";

const MemoizedMatchEventLog = memo(MatchEventLog);

const ReplayEventLog = ({
  clock,
  round,
  players,
  viewerPuuid,
  onSelectEvent,
}: {
  clock: ReplayClock;
  round: ReplayRound;
  players: MatchPlayers;
  viewerPuuid?: string;
  onSelectEvent: (eventIndex: number) => void;
}) => {
  const currentTimeMs = useReplayClockStep(clock, 100);
  const selectedEventIndex = useMemo(
    () => getActiveEventIndex(round, currentTimeMs),
    [currentTimeMs, round],
  );

  return (
    <MemoizedMatchEventLog
      containerClassName="md:h-auto"
      scrollAreaClassName="h-[240px] md:h-[300px]"
      events={round.eventLog}
      players={players}
      currentPlayerPuuid={viewerPuuid}
      selectedEventIndex={selectedEventIndex}
      onSelectEvent={onSelectEvent}
    />
  );
};

export const ReplayRoundSidebar = ({
  sidebarOpen,
  setSidebarOpen,
  players,
  round,
  clock,
  viewerPuuid,
  onSelectEvent,
  warnings,
  replayId,
}: {
  sidebarOpen: boolean;
  setSidebarOpen?: (open: boolean) => void;
  players: MatchPlayers;
  round: ReplayRound;
  clock: ReplayClock;
  viewerPuuid?: string;
  onSelectEvent: (eventIndex: number) => void;
  warnings?: string[];
  replayId: string;
}) => {
  return (
    <SidebarProvider
      open={sidebarOpen}
      onOpenChange={setSidebarOpen}
      style={{
        ["--sidebar-width" as keyof React.CSSProperties]: `${SIDEBAR_WIDTH}px`,
        ["--sidebar-width-mobile" as keyof React.CSSProperties]: `${SIDEBAR_WIDTH}px`,
      }}
    >
      <Sidebar
        className="top-(--header-height) h-[calc(100svh-var(--header-height))]!"
        collapsible="offcanvas"
        side="right"
      >
        <SidebarHeader>
          <div className="space-y-2 p-3 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold">Replay</span>
            </div>
            <ReplayScoreHeader round={round} clock={clock} />
          </div>
        </SidebarHeader>

        <SidebarContent className="gap-0 px-3 pb-4">
          <ReplayWarningsBanner
            warnings={warnings}
            replayId={replayId}
            className="mb-2"
          />

          <ReplayScoreboard
            players={players}
            round={round}
            clock={clock}
            viewerPuuid={viewerPuuid}
          />

          <div className="mt-3 border-t border-slate-800/80 pt-2">
            <ReplayEventLog
              clock={clock}
              round={round}
              players={players}
              viewerPuuid={viewerPuuid}
              onSelectEvent={onSelectEvent}
            />
          </div>
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  );
};
