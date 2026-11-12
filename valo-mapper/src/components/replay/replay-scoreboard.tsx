"use client";

import { MATCH_TONE_CLASSES } from "@/lib/consts";
import { useReplayClockStep } from "@/hooks/use-replay-clock";
import { getAgentImageSrc } from "@/lib/matches";
import type { ReplayClock } from "@/lib/replay/clock";
import {
  formatReplayTime,
  getPlayerHpBarColor,
  getPlayerHpTone,
  getReplayAbilityDisplays,
  getReplayArmor,
  getReplayBuyPhaseUtilityCastTimes,
  getReplayPlayerState,
  getWeaponImageSrc,
  mergeReplayAbilityCastTimes,
  type ReplayAbilityDisplay,
} from "@/lib/replay/display";
import { getReplayPlayerStateAtTime } from "@/lib/replay/frames";
import type {
  ReplayFramePlayer,
  ReplayRound,
  ReplayRoundPlayer,
} from "@/lib/replay/types";
import type { MatchPlayerSummary } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Shield } from "lucide-react";
import Image from "next/image";
import { useMemo } from "react";

const PIP_ROW_SIZE = 4;

const AbilityChargePips = ({
  charges,
  remaining,
  rowSize = PIP_ROW_SIZE,
}: {
  charges: number;
  remaining: number;
  rowSize?: number;
}) => {
  if (charges <= 0) {
    return null;
  }

  const rows = Array.from(
    { length: Math.ceil(charges / rowSize) },
    (_, rowIndex) =>
      Array.from(
        { length: Math.min(rowSize, charges - rowIndex * rowSize) },
        (_, columnIndex) => rowIndex * rowSize + columnIndex,
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
  const castTimes =
    ability.castTimesMs ??
    (ability.castTimeMs !== undefined ? [ability.castTimeMs] : []);
  const usedCount = castTimes.filter((timeMs) => timeMs <= currentTimeMs).length;
  const isUltimate = ability.slot === "Ultimate";
  const ultimateTimeline = ability.ultimateTimeline;
  const ultimatePoint = ultimateTimeline?.length
    ? ([...ultimateTimeline]
        .reverse()
        .find((point) => point.timeMs <= currentTimeMs) ?? ultimateTimeline[0])
    : undefined;
  const ultimateCost = ability.ultimateCost ?? 0;
  const ultimatePoints = ultimatePoint
    ? Math.max(
        0,
        Math.min(
          ultimateCost > 0 ? ultimateCost : ultimatePoint.points,
          ultimatePoint.points,
        ),
      )
    : 0;
  const ultimateActive = ultimatePoint?.active ?? false;
  const ultimateReady =
    ultimateActive ||
    (ultimateCost > 0 ? ultimatePoints >= ultimateCost : ultimatePoints > 0);

  const totalCharges = ability.charges ?? 0;
  const maxCharges = isUltimate
    ? ultimatePoint
      ? ultimateCost
      : 0
    : totalCharges;
  const chargeTimeline = ability.chargeTimeline;
  const timelinePoint = chargeTimeline
    ? ([...chargeTimeline]
        .reverse()
        .find((point) => point.timeMs <= currentTimeMs) ?? chargeTimeline[0])
    : undefined;
  const remaining = isUltimate
    ? ultimatePoint
      ? ultimateActive
        ? maxCharges
        : ultimatePoints
      : Math.max(0, maxCharges - usedCount)
    : timelinePoint
      ? Math.max(
          0,
          Math.min(maxCharges || timelinePoint.charges, timelinePoint.charges),
        )
      : Math.max(0, maxCharges - usedCount);
  const cooldown = ability.cooldowns?.find(
    (window) =>
      window.startTimeMs <= currentTimeMs && currentTimeMs < window.endTimeMs,
  );
  const cooldownSeconds = cooldown
    ? Math.max(1, Math.ceil((cooldown.endTimeMs - currentTimeMs) / 1000))
    : 0;

  let depleted: boolean;
  if (isUltimate && ultimatePoint) {
    depleted = !ultimateReady;
  } else {
    depleted = timelinePoint
      ? remaining === 0
      : maxCharges > 0
        ? remaining === 0
        : usedCount > 0;
  }
  if (cooldown) {
    // Timer cooldowns always make the ability unavailable. A recharge window
    // only does so when the last charge was used.
    depleted = !cooldown.recharge || maxCharges === 0 || remaining === 0;
  }

  let status: string;
  if (isUltimate && ultimatePoint) {
    if (ultimateActive) {
      status = "active";
    } else if (ultimateCost > 0) {
      status = `${ultimatePoints}/${ultimateCost} points${ultimateReady ? " · ready" : ""}`;
    } else {
      status = `${ultimatePoints} points`;
    }
  } else if (maxCharges) {
    status = `${remaining}/${maxCharges} charges`;
  } else {
    status = depleted ? "used" : "available";
  }
  if (cooldown) {
    status += ` · ${cooldownSeconds}s cooldown`;
  }

  return (
    <span
      title={`${ability.name} (${ability.key}) — ${status}`}
      className="flex min-w-0 flex-1 flex-col items-center gap-0.5"
    >
      <span
        className={cn(
          "relative inline-flex h-6 w-6 items-center justify-center overflow-hidden rounded-[3px] border",
          depleted
            ? "border-slate-700/60 bg-slate-900/40 opacity-35 grayscale"
            : ultimateActive
              ? "border-amber-300/80 bg-amber-400/10"
              : isUltimate && ultimateReady
                ? "border-emerald-300/70 bg-slate-800/80"
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
        {cooldown && depleted ? (
          <span className="absolute inset-0 flex items-center justify-center bg-slate-950/70 text-[9px] font-bold tabular-nums text-white">
            {cooldownSeconds}s
          </span>
        ) : (
          <span className="absolute bottom-0 right-0 bg-slate-950/80 px-0.5 text-[7px] font-bold uppercase leading-[1.15] text-white/65">
            {ability.key}
          </span>
        )}
      </span>
      <AbilityChargePips
        charges={maxCharges}
        remaining={remaining}
        rowSize={isUltimate ? Math.max(maxCharges, 1) : PIP_ROW_SIZE}
      />
    </span>
  );
};

const PlayerRow = ({
  player,
  stats,
  framePlayer,
  utilityCastTimes,
  buyEndTimeMs,
  currentTimeMs,
  tone,
}: {
  player: MatchPlayerSummary;
  stats?: ReplayRoundPlayer;
  framePlayer: ReplayFramePlayer | null;
  utilityCastTimes: Parameters<typeof mergeReplayAbilityCastTimes>[1];
  buyEndTimeMs?: number;
  currentTimeMs: number;
  tone: "blue" | "red";
}) => {
  const state = getReplayPlayerState(framePlayer, {
    credits: stats?.economy.remaining ?? 0,
    weaponId: stats?.weaponId,
    armorId: stats?.armorId,
  });
  const abilities = getReplayAbilityDisplays(
    player.characterName,
    stats?.abilityCasts,
    mergeReplayAbilityCastTimes(
      stats?.abilityCastTimes,
      utilityCastTimes,
      buyEndTimeMs,
    ),
    stats?.abilityCharges,
    stats?.ultimatePoints,
    stats?.cooldowns,
  );
  const ultimate = abilities.find((ability) => ability.slot === "Ultimate");
  const basics = abilities.filter((ability) => ability.slot !== "Ultimate");
  const armor = getReplayArmor(state.armorId);
  const armorValue = state.alive ? (state.armorPoints ?? armor?.value ?? 0) : 0;
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
        <div
          className={cn(
            "relative h-8 w-8 shrink-0 overflow-hidden rounded-sm border bg-slate-900",
            MATCH_TONE_CLASSES[tone].accentBorder,
          )}
        >
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
              {player.characterName}
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
              <span className="text-white/60">/100</span>
            </span>
          </div>
        </div>

        <div
          className="flex shrink-0 items-center gap-1 text-xs font-semibold tabular-nums"
          title={armor ? `${armor.label} + health` : "Health"}
        >
          {armor ? (
            <Image
              src={armor.src}
              alt={armor.label}
              width={14}
              height={14}
              className="h-3.5 w-3.5 object-contain"
            />
          ) : (
            <Shield aria-hidden="true" className="h-3.5 w-3.5" />
          )}
          <span className="text-sky-200/90">{armorValue}</span>
          <span
            className={cn("ml-0.5", getPlayerHpTone(state.hp, state.alive))}
          >
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
              <span className="text-[9px] text-white/50">—</span>
            )}
          </div>
          <span
            className="flex shrink-0 items-center gap-1 text-xs font-semibold tabular-nums text-amber-200/90"
            aria-label={`${state.credits} credits`}
          >
            <Image
              src="/credits.webp"
              alt=""
              width={12}
              height={12}
              className="h-3 w-3 object-contain"
            />
            {state.credits}
          </span>
        </div>
      </div>
    </div>
  );
};

const TeamBlock = ({
  title,
  players,
  round,
  states,
  currentTimeMs,
  tone,
}: {
  title: string;
  players: MatchPlayerSummary[];
  round: ReplayRound;
  states: Map<string, ReplayFramePlayer | null>;
  currentTimeMs: number;
  tone: "blue" | "red";
}) => {
  const aliveCount = players.filter(
    (player) => states.get(player.puuid)?.alive ?? true,
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
        <span className="text-[10px] font-medium text-white/70">
          {aliveCount} alive
        </span>
      </header>

      <div>
        {players.map((player) => (
          <PlayerRow
            key={player.puuid}
            player={player}
            stats={round.playerStats.find(
              (candidate) => candidate.puuid === player.puuid,
            )}
            framePlayer={states.get(player.puuid) ?? null}
            utilityCastTimes={getReplayBuyPhaseUtilityCastTimes({
              agentName: player.characterName,
              utilities: round.utilities,
              ownerPuuid: player.puuid,
              buyEndTimeMs: round.buyEndTimeMs,
            })}
            buyEndTimeMs={round.buyEndTimeMs}
            currentTimeMs={currentTimeMs}
            tone={tone}
          />
        ))}
      </div>
    </section>
  );
};

export const ReplayScoreboard = ({
  players,
  round,
  clock,
  viewerPuuid,
}: {
  players: MatchPlayerSummary[];
  round: ReplayRound;
  clock: ReplayClock;
  viewerPuuid?: string;
}) => {
  const currentTimeMs = useReplayClockStep(clock, 250);
  const states = useMemo(() => {
    const next = new Map<string, ReplayFramePlayer | null>();
    for (const player of players) {
      next.set(
        player.puuid,
        getReplayPlayerStateAtTime(round, player.puuid, currentTimeMs),
      );
    }
    return next;
  }, [currentTimeMs, players, round]);
  const viewerTeamId =
    players.find((player) => player.puuid === viewerPuuid)?.teamId ?? "Blue";
  const allyTeamId = viewerTeamId;
  const enemyTeamId = allyTeamId === "Blue" ? "Red" : "Blue";

  const allies = players.filter((player) => player.teamId === allyTeamId);
  const enemies = players.filter((player) => player.teamId === enemyTeamId);

  return (
    <div className="space-y-2">
      <TeamBlock
        title={`${allyTeamId} Team`}
        players={allies}
        round={round}
        states={states}
        currentTimeMs={currentTimeMs}
        tone={allyTeamId === "Blue" ? "blue" : "red"}
      />
      <TeamBlock
        title={`${enemyTeamId} Team`}
        players={enemies}
        round={round}
        states={states}
        currentTimeMs={currentTimeMs}
        tone={enemyTeamId === "Blue" ? "blue" : "red"}
      />
    </div>
  );
};

export const ReplayScoreHeader = ({
  round,
  clock,
}: {
  round: ReplayRound;
  clock: ReplayClock;
}) => {
  const currentTimeMs = useReplayClockStep(clock, 1000);

  return (
    <div className="flex items-center justify-between gap-2">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60">
          Round {round.roundNumber} ·{" "}
          {round.attackTeamId === "Blue" ? "Blue attack" : "Red attack"}
        </p>
        <p className="text-sm font-semibold text-white">
          {round.scoreAfterRound.red} – {round.scoreAfterRound.blue}
        </p>
      </div>
      <div className="text-right">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60">
          Time
        </p>
        <p className="text-sm font-semibold tabular-nums text-white">
          {formatReplayTime(currentTimeMs)}
        </p>
      </div>
    </div>
  );
};
