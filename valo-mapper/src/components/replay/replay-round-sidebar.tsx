"use client";

import { MatchEventLog } from "@/components/matches/match-event-log";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { SIDEBAR_WIDTH } from "@/lib/consts";
import type { ReplayRound } from "@/lib/replay/types";
import type { MatchPlayers } from "@/lib/matches";
import { ReplayScoreHeader, ReplayScoreboard } from "./replay-scoreboard";

export const ReplayRoundSidebar = ({
  sidebarOpen,
  players,
  round,
  currentTimeMs,
  viewerPuuid,
  selectedEventIndex,
  onSelectEvent,
}: {
  sidebarOpen: boolean;
  players: MatchPlayers;
  round: ReplayRound;
  currentTimeMs: number;
  viewerPuuid?: string;
  selectedEventIndex: number | null;
  onSelectEvent: (eventIndex: number) => void;
}) => {
  return (
    <SidebarProvider
      open={sidebarOpen}
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
              <span className="rounded-sm border border-slate-700/80 bg-slate-900/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/55">
                Live
              </span>
            </div>
            <ReplayScoreHeader round={round} currentTimeMs={currentTimeMs} />
          </div>
        </SidebarHeader>

        <SidebarContent className="gap-0 px-3 pb-4">
          <ReplayScoreboard
            players={players}
            round={round}
            currentTimeMs={currentTimeMs}
            viewerPuuid={viewerPuuid}
          />

          <div className="mt-3 border-t border-slate-800/80 pt-2">
            <MatchEventLog
              containerClassName="md:h-auto"
              scrollAreaClassName="h-[240px] md:h-[300px]"
              events={round.eventLog}
              players={players}
              currentPlayerPuuid={viewerPuuid}
              selectedEventIndex={selectedEventIndex}
              onSelectEvent={onSelectEvent}
            />
          </div>
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  );
};
