"use client";

import { MATCH_TONE_CLASSES } from "@/lib/consts";
import { getAgentImageSrc } from "@/lib/matches";
import {
  formatReplayTime,
  getPlayerHpBarColor,
  getPlayerHpTone,
  getReplayAbilityDisplays,
  getReplayArmor,
  getReplayPlayerState,
  getWeaponImageSrc,
  isAbilityUsed,
  type ReplayAbilityDisplay,
} from "@/lib/replay/display";
import { getReplayAgentLabels } from "@/lib/replay/snapshot";
import type {
  ReplayFrame,
  ReplayFramePlayer,
  ReplayRound,
  ReplayRoundPlayer,
} from "@/lib/replay/types";
import type { MatchPlayerSummary } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Shield } from "lucide-react";
import Image from "next/image";

const getFramePlayer = (frame: ReplayFrame | null, puuid: string) =>
  frame?.players.find((player) => player.puuid === puuid);

const PIP_ROW_SIZE = 4;

const AbilityChargePips = ({
  charges,
  remaining,
}: {
  charges: number;
  remaining: number;
}) => {
  if (charges <= 0) {
    return null;
  }

  const rows = Array.from(
    { length: Math.ceil(charges / PIP_ROW_SIZE) },
    (_, rowIndex) =>
      Array.from(
        { length: Math.min(PIP_ROW_SIZE, charges - rowIndex * PIP_ROW_SIZE) },
        (_, columnIndex) => rowIndex * PIP_ROW_SIZE + columnIndex,
      ),
  );

  return (
    <span className="flex min-h-[5px] w-full max-w-8 flex-col gap-px">
      {rows.map((row, rowIndex) => (
        <span key={rowIndex} className="flex h-0.5 w-full gap-px">
          {row.map((chargeIndex) => (
            <span
              key={chargeIndex}
              className={cn(
                "h-0.5 flex-1 rounded-[1px]",
                chargeIndex < remaining ? "bg-white/65" : "bg-white/15",
              )}
            />
          ))}
        </span>
      ))}
    </span>
  );
};

const AbilityCell = ({
  ability,
  currentTimeMs,
}: {
  ability: ReplayAbilityDisplay;
  currentTimeMs: number;
}) => {
  const used = isAbilityUsed(ability, currentTimeMs);
  const maxCharges = ability.charges ?? 0;
  // Replay telemetry only stores the first cast per ability, so a used ability
  // loses a single charge for display purposes.
  const remaining = used ? Math.max(0, maxCharges - 1) : maxCharges;

  const status = maxCharges
    ? `${remaining}/${maxCharges} charges`
    : used
      ? "used"
      : "available";

  return (
    <span
      title={`${ability.name} (${ability.key}) — ${status}`}
      className="flex min-w-0 flex-1 flex-col items-center gap-0.5"
    >
      <span
        className={cn(
          "relative inline-flex h-6 w-6 items-center justify-center overflow-hidden rounded-[3px] border",
          used
            ? "border-slate-700/60 bg-slate-900/40 opacity-35 grayscale"
            : "border-white/20 bg-slate-800/80",
        )}
      >
        <Image
          src={ability.src}
          alt={ability.name}
          width={20}
          height={20}
          className="h-5 w-5 object-contain"
        />
        <span className="absolute bottom-0 right-0 bg-slate-950/80 px-0.5 text-[7px] font-bold uppercase leading-[1.15] text-white/65">
          {ability.key}
        </span>
      </span>
      <AbilityChargePips charges={maxCharges} remaining={remaining} />
    </span>
  );
};

const PlayerRow = ({
  player,
  label,
  stats,
  framePlayer,
  currentTimeMs,
}: {
  player: MatchPlayerSummary;
  label: string;
  stats?: ReplayRoundPlayer;
  framePlayer?: ReplayFramePlayer;
  currentTimeMs: number;
}) => {
  const state = getReplayPlayerState(framePlayer, {
    credits: stats?.economy.remaining ?? 0,
    weaponId: stats?.weaponId,
    armorId: stats?.armorId,
  });
  const abilities = getReplayAbilityDisplays(
    player.characterName,
    stats?.abilityCasts,
  );
  const ultimate = abilities.find((ability) => ability.slot === "Ultimate");
  const basics = abilities.filter((ability) => ability.slot !== "Ultimate");
  const armor = getReplayArmor(state.armorId);
  const armorValue = state.alive ? (armor?.value ?? 0) : 0;
  const weaponSrc = getWeaponImageSrc(state.weaponId);
  const hpPercent = Math.max(0, Math.min(100, state.hp));
  const hpValue = state.alive ? state.hp : 0;

  return (
    <div
      className={cn(
        "border-b border-slate-800/70 px-2 py-1.5 last:border-b-0",
        !state.alive && "opacity-45",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-sm border border-slate-700/80 bg-slate-900">
          <Image
            src={getAgentImageSrc(player.characterName)}
            alt={player.characterName}
            fill
            sizes="32px"
            className="object-cover"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1">
            <span className="truncate text-[12px] font-semibold leading-tight text-white">
              {player.gameName}
            </span>
            <span className="truncate text-[10px] leading-tight text-white/45">
              / {label}
            </span>
          </div>

          <div className="mt-1 flex items-center gap-1.5">
            <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-800">
              <div
                className={cn(
                  "h-full rounded-full",
                  getPlayerHpBarColor(state.hp, state.alive),
                )}
                style={{ width: `${hpPercent}%` }}
              />
            </div>
            <span
              className={cn(
                "shrink-0 text-xs font-semibold tabular-nums",
                getPlayerHpTone(state.hp, state.alive),
              )}
            >
              {hpValue}
              <span className="text-white/35">/100</span>
            </span>
          </div>
        </div>

        <div
          className="flex shrink-0 items-center gap-1 text-xs font-semibold tabular-nums"
          title={armor ? `${armor.label} + health` : "Health"}
        >
          <Shield className="h-3.5 w-3.5 text-sky-300/80" />
          <span className="text-sky-200/90">{armorValue}</span>
          <span className={cn("ml-0.5", getPlayerHpTone(state.hp, state.alive))}>
            {hpValue}
          </span>
        </div>
      </div>

      <div className="mt-1.5 flex items-center gap-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-1">
          {ultimate && (
            <AbilityCell ability={ultimate} currentTimeMs={currentTimeMs} />
          )}

          <span className="h-4 w-px shrink-0 bg-slate-800" aria-hidden />

          {basics.map((ability) => (
            <AbilityCell
              key={`${player.puuid}-${ability.slot}`}
              ability={ability}
              currentTimeMs={currentTimeMs}
            />
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <div className="flex h-4 w-10 items-center justify-end">
            {weaponSrc ? (
              <Image
                src={weaponSrc}
                alt="Weapon"
                width={40}
                height={14}
                className="h-3.5 w-10 object-contain object-right"
              />
            ) : (
              <span className="text-[9px] text-white/30">—</span>
            )}
          </div>
          <span className="shrink-0 text-xs font-semibold tabular-nums text-amber-200/90">
            ¢{state.credits}
          </span>
        </div>
      </div>
    </div>
  );
};

const TeamBlock = ({
  title,
  players,
  labels,
  round,
  frame,
  currentTimeMs,
  tone,
}: {
  title: string;
  players: MatchPlayerSummary[];
  labels: Map<string, string>;
  round: ReplayRound;
  frame: ReplayFrame | null;
  currentTimeMs: number;
  tone: "blue" | "red";
}) => {
  const aliveCount = players.filter(
    (player) => getFramePlayer(frame, player.puuid)?.alive ?? true,
  ).length;
  const toneClasses = MATCH_TONE_CLASSES[tone];

  return (
    <section className="overflow-hidden rounded-md border border-slate-800/80 bg-slate-950/45">
      <header
        className={cn(
          "flex items-center justify-between border-b border-slate-800/80 px-2 py-1.5",
          toneClasses.contentBg,
        )}
      >
        <span
          className={cn(
            "text-[11px] font-bold uppercase tracking-[0.12em]",
            toneClasses.accentText,
          )}
        >
          {title}
        </span>
        <span className="text-[10px] font-medium text-white/55">
          {aliveCount} alive
        </span>
      </header>

      <div>
        {players.map((player) => (
          <PlayerRow
            key={player.puuid}
            player={player}
            label={labels.get(player.puuid) ?? player.characterName}
            stats={round.playerStats.find(
              (candidate) => candidate.puuid === player.puuid,
            )}
            framePlayer={getFramePlayer(frame, player.puuid)}
            currentTimeMs={currentTimeMs}
          />
        ))}
      </div>
    </section>
  );
};

export const ReplayScoreboard = ({
  players,
  round,
  frame,
  currentTimeMs,
  viewerPuuid,
}: {
  players: MatchPlayerSummary[];
  round: ReplayRound;
  frame: ReplayFrame | null;
  currentTimeMs: number;
  viewerPuuid?: string;
}) => {
  const labels = getReplayAgentLabels(players);
  const viewerTeamId =
    players.find((player) => player.puuid === viewerPuuid)?.teamId ?? "Blue";
  const allyTeamId = viewerTeamId;
  const enemyTeamId = allyTeamId === "Blue" ? "Red" : "Blue";

  const allies = players.filter((player) => player.teamId === allyTeamId);
  const enemies = players.filter((player) => player.teamId === enemyTeamId);

  return (
    <div className="space-y-2">
      <TeamBlock
        title="Allies"
        players={allies}
        labels={labels}
        round={round}
        frame={frame}
        currentTimeMs={currentTimeMs}
        tone="blue"
      />
      <TeamBlock
        title="Enemies"
        players={enemies}
        labels={labels}
        round={round}
        frame={frame}
        currentTimeMs={currentTimeMs}
        tone="red"
      />
    </div>
  );
};

export const ReplayScoreHeader = ({
  round,
  currentTimeMs,
}: {
  round: ReplayRound;
  currentTimeMs: number;
}) => {
  return (
    <div className="flex items-center justify-between gap-2">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
          Round {round.roundNumber} ·{" "}
          {round.attackTeamId === "Blue" ? "Blue attack" : "Red attack"}
        </p>
        <p className="text-sm font-semibold text-white">
          {round.scoreAfterRound.red} – {round.scoreAfterRound.blue}
        </p>
      </div>
      <div className="text-right">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
          Time
        </p>
        <p className="text-sm font-semibold tabular-nums text-white">
          {formatReplayTime(currentTimeMs)}
        </p>
      </div>
    </div>
  );
};
