"use client";

import { MatchRoundSelector } from "@/components/matches/match-round-selector";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useReplayClockStep } from "@/hooks/use-replay-clock";
import type { MatchPlayers } from "@/lib/matches";
import type { ReplayClock } from "@/lib/replay/clock";
import { formatReplayTime } from "@/lib/replay/display";
import type { ReplayRound } from "@/lib/replay/types";
import { REPLAY_SPEEDS, type ReplaySpeed } from "@/hooks/use-replay-playback";
import { Pause, Play } from "lucide-react";
import { memo } from "react";
import { ReplaySettingsMenu } from "./replay-settings-menu";
import { ReplayTimeline } from "./replay-timeline";

const ReplaySpeedSelect = memo(function ReplaySpeedSelect({
  speed,
  onSpeedChange,
}: {
  speed: ReplaySpeed;
  onSpeedChange: (speed: ReplaySpeed) => void;
}) {
  return (
    <Select
      value={String(speed)}
      onValueChange={(value) => onSpeedChange(Number(value) as ReplaySpeed)}
    >
      <SelectTrigger size="sm" className="h-10 w-[68px] shrink-0 sm:h-8">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {REPLAY_SPEEDS.map((option) => (
          <SelectItem key={option} value={String(option)}>
            {option}×
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});

const ReplayTimeLabel = ({ clock }: { clock: ReplayClock }) => {
  const currentTimeMs = useReplayClockStep(clock, 1000);

  return <>{formatReplayTime(currentTimeMs)}</>;
};

export const ReplayControlsBar = ({
  rounds,
  selectedRoundNumber,
  // Replays have no viewer, so the canvas and scoreboard treat Blue as the
  // ally side. Use the same convention for the timeline's win/loss icons.
  currentPlayerTeamId = "Blue",
  currentPlayerBestRoundNumber,
  onSelectRound,
  round,
  players,
  clock,
  isPlaying,
  speed,
  onTogglePlay,
  onSeek,
  onSpeedChange,
  hideDeadAgents,
  onHideDeadAgentsChange,
  hideAgentWeapons,
  onHideAgentWeaponsChange,
  hideWeaponHits,
  onHideWeaponHitsChange,
  showVisionCones,
  onShowVisionConesChange,
  showUtilities,
  onShowUtilitiesChange,
  startAtBarrierDrop,
  onStartAtBarrierDropChange,
}: {
  rounds: ReplayRound[];
  selectedRoundNumber: number;
  currentPlayerTeamId?: string;
  currentPlayerBestRoundNumber?: number;
  onSelectRound: (roundNumber: number) => void;
  round: ReplayRound;
  players: MatchPlayers;
  clock: ReplayClock;
  isPlaying: boolean;
  speed: ReplaySpeed;
  onTogglePlay: () => void;
  onSeek: (timeMs: number) => void;
  onSpeedChange: (speed: ReplaySpeed) => void;
  hideDeadAgents: boolean;
  onHideDeadAgentsChange: (hideDeadAgents: boolean) => void;
  hideAgentWeapons: boolean;
  onHideAgentWeaponsChange: (hideAgentWeapons: boolean) => void;
  hideWeaponHits: boolean;
  onHideWeaponHitsChange: (hideWeaponHits: boolean) => void;
  showVisionCones: boolean;
  onShowVisionConesChange: (showVisionCones: boolean) => void;
  showUtilities: boolean;
  onShowUtilitiesChange: (showUtilities: boolean) => void;
  startAtBarrierDrop: boolean;
  onStartAtBarrierDropChange: (startAtBarrierDrop: boolean) => void;
}) => {
  return (
    <div className="border-t border-sidebar-border bg-sidebar pb-[env(safe-area-inset-bottom)]">
      <div className="px-2 pt-1">
        <MatchRoundSelector
          rounds={rounds}
          selectedRoundNumber={selectedRoundNumber}
          currentPlayerTeamId={currentPlayerTeamId}
          currentPlayerBestRoundNumber={currentPlayerBestRoundNumber}
          onSelectRound={onSelectRound}
        />
      </div>

      <div className="flex items-center gap-2 px-2 pb-2">
        <Button
          type="button"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-full sm:h-8 sm:w-8"
          onClick={onTogglePlay}
          aria-label={isPlaying ? "Pause replay" : "Play replay"}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>

        <div className="w-16 shrink-0 text-[11px] font-semibold tabular-nums text-white/80 sm:w-20">
          <ReplayTimeLabel clock={clock} />
          <span className="text-white/60">
            {" "}
            / {formatReplayTime(round.durationMs)}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <ReplayTimeline
            round={round}
            players={players}
            clock={clock}
            onSeek={onSeek}
          />
        </div>

        <ReplaySpeedSelect speed={speed} onSpeedChange={onSpeedChange} />

        <ReplaySettingsMenu
          hideDeadAgents={hideDeadAgents}
          onHideDeadAgentsChange={onHideDeadAgentsChange}
          hideAgentWeapons={hideAgentWeapons}
          onHideAgentWeaponsChange={onHideAgentWeaponsChange}
          hideWeaponHits={hideWeaponHits}
          onHideWeaponHitsChange={onHideWeaponHitsChange}
          showVisionCones={showVisionCones}
          onShowVisionConesChange={onShowVisionConesChange}
          showUtilities={showUtilities}
          onShowUtilitiesChange={onShowUtilitiesChange}
          startAtBarrierDrop={startAtBarrierDrop}
          onStartAtBarrierDropChange={onStartAtBarrierDropChange}
        />
      </div>

      <div className="hidden items-center gap-3 px-2 pb-2 text-[10px] text-white/60 md:flex">
        <span>
          <kbd className="rounded border border-sidebar-border px-1">Space</kbd>{" "}
          play / pause
        </span>
        <span>
          <kbd className="rounded border border-sidebar-border px-1">←</kbd>
          <kbd className="ml-1 rounded border border-sidebar-border px-1">
            →
          </kbd>{" "}
          seek
        </span>
        <span>
          <kbd className="rounded border border-sidebar-border px-1">,</kbd>
          <kbd className="ml-1 rounded border border-sidebar-border px-1">
            .
          </kbd>{" "}
          speed
        </span>
      </div>
    </div>
  );
};
