"use client";

import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useMatches } from "@/hooks/api/use-matches";
import { useUser } from "@/hooks/api/use-user";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { MatchPreview, MatchSummaryResponse } from "@/lib/types";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMatchSummary } from "@/hooks/api/use-match-summary";

const getAgentImageSrc = (agentName: string) => {
  const normalized = (agentName || "Astra").trim().toLowerCase();
  return `/agents/${normalized}/${normalized}.png`;
};

const getMapImageSrc = (mapName: string) => {
  const normalized = (mapName || "ascent").toLowerCase().replace(/\s+/g, "");
  return `/maps/listviewicons/${normalized}.webp`;
};

const getResultLabel = (result: MatchPreview["result"]) => {
  return result === "Win" ? "Victory" : "Defeat";
};
const getPlayerSummary = (
  players: MatchSummaryResponse["players"],
  puuid?: string,
) => {
  if (!puuid) {
    return undefined;
  }

  return players.find((player) => player.puuid === puuid);
};

const getPlayerAgentIconSrc = (
  players: MatchSummaryResponse["players"],
  puuid?: string,
) => {
  const player = getPlayerSummary(players, puuid);
  return getAgentImageSrc(player?.characterName || "Astra");
};

const getWeaponKillstreamImageSrc = (weaponId: string) => {
  return `/weapons/${weaponId.trim().toUpperCase()}_killstream.png`;
};

const formatTimeSinceRoundStart = (timeSinceRoundStartMillis: number) => {
  const totalSeconds = Math.floor(timeSinceRoundStartMillis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const renderRoundEventRow = (
  event: MatchSummaryResponse["rounds"][number]["eventLog"][number],
  index: number,
  players: MatchSummaryResponse["players"],
) => {
  const actorPuuid =
    event.eventType === "kill"
      ? event.killerPuuid
      : event.eventType === "spike_planted"
        ? event.planterPuuid
        : event.defuserPuuid;

  const actorTeamId = getPlayerSummary(players, actorPuuid)?.teamId;
  const victimTeamId =
    event.eventType === "kill"
      ? getPlayerSummary(players, event.victimPuuid)?.teamId
      : undefined;

  const leftAccent = actorTeamId === "Blue" ? "bg-[#42EEC7]" : "bg-[#FF4655]";
  const rightAccent = victimTeamId === "Blue" ? "bg-[#42EEC7]" : "bg-[#FF4655]";

  const iconShade = actorTeamId === "Blue" ? "bg-[#19ac92]" : "bg-[#c65063]";

  const contentShade =
    actorTeamId === "Blue" ? "bg-[#19767480]" : "bg-[#3f2d3f80]";

  if (event.eventType === "kill") {
    return (
      <li
        key={index}
        className="relative isolate overflow-hidden border border-slate-800/80"
      >
        <div className={`absolute inset-y-0 left-0 w-1.5 ${leftAccent}`} />
        <div className={`absolute inset-y-0 right-0 w-1.5 ${rightAccent}`} />

        <div className="relative z-10 px-2">
          <div className="grid grid-cols-[32px_50px_1fr_32px] items-stretch">
            <div className={`relative h-8 overflow-hidden ${iconShade}`}>
              <Image
                src={getPlayerAgentIconSrc(players, event.killerPuuid)}
                alt="Killer"
                fill
                sizes="32px"
                className="object-fill"
              />
            </div>

            <div className={`flex items-center justify-center ${contentShade}`}>
              <span className="text-xs font-semibold tabular-nums text-white">
                {formatTimeSinceRoundStart(event.timeSinceRoundStartMillis)}
              </span>
            </div>

            <div
              className={`flex items-center justify-center min-w-0 ${contentShade}`}
            >
              <div className="relative h-4 w-full ml-3">
                <Image
                  src={getWeaponKillstreamImageSrc(event.weaponId)}
                  alt="Weapon"
                  fill
                  sizes="120px"
                  className="object-contain object-right scale-x-[-1]"
                />
              </div>
            </div>

            <div
              className={`relative h-8 overflow-hidden ${
                victimTeamId === "Blue" ? "bg-[#19ac92]" : "bg-[#c65063]"
              }`}
            >
              <Image
                src={getPlayerAgentIconSrc(players, event.victimPuuid)}
                alt="Victim"
                fill
                sizes="32px"
                className="object-fill"
              />
            </div>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li
      key={index}
      className="relative isolate overflow-hidden border border-slate-800/80"
    >
      <div className={`absolute inset-y-0 left-0 w-1.5 ${leftAccent}`} />

      <div className="relative z-10 pl-2 pr-0">
        <div className="grid grid-cols-[32px_50px_1fr_auto] items-stretch">
          <div className={`relative h-8 overflow-hidden ${iconShade}`}>
            <Image
              src={getPlayerAgentIconSrc(players, actorPuuid)}
              alt="Player"
              fill
              sizes="32px"
              className="object-fill"
            />
          </div>

          <div className={`flex items-center justify-center ${contentShade}`}>
            <span className="text-xs font-semibold tabular-nums text-white">
              {formatTimeSinceRoundStart(event.timeSinceRoundStartMillis)}
            </span>
          </div>

          <div className={`min-w-0 ${contentShade}`}>
            <div className="relative h-8 w-full px-2">
              {event.eventType === "spike_planted" ? (
                <Image
                  src="/tools/spike.webp"
                  alt="Spike"
                  fill
                  sizes="32px"
                  className="object-contain object-right scale-[-0.65]"
                />
              ) : (
                <Image
                  src="/matchOutcomes/defuse.png"
                  alt="Defuse"
                  fill
                  sizes="32px"
                  className="object-contain object-left scale-[0.7]"
                />
              )}
            </div>
          </div>

          <div className={`flex items-center pl-2 pr-0 ${contentShade}`}>
            <span className="pr-1 text-sm tracking-[0.04em] text-white/90">
              {event.eventType === "spike_planted" ? "Planted" : "Defused"}
            </span>
          </div>
        </div>
      </div>
    </li>
  );
};

const getRoundOutcomeText = (
  roundResultCode: string,
  winningTeam: string,
  currentPlayerTeamId: string | undefined,
) => {
  const normalizedResult =
    roundResultCode === "TimeExpired"
      ? "Time Expired"
      : roundResultCode === "Detonate"
        ? "Detonation"
        : roundResultCode;

  if (!currentPlayerTeamId) {
    return normalizedResult;
  }

  const outcome = winningTeam === currentPlayerTeamId ? "Win" : "Loss";
  return `${normalizedResult} ${outcome}`;
};

const getRoundOutcomeIconSrc = (
  roundResultCode: string,
  winningTeam: string,
  currentPlayerTeamId: string | undefined,
  isBestRound: boolean,
) => {
  if (isBestRound) {
    return "/matchOutcomes/TX_Icon_MVPStar_Gold.png";
  }

  const outcomeSuffix = currentPlayerTeamId
    ? winningTeam === currentPlayerTeamId
      ? "win1"
      : "loss1"
    : "win1";

  switch (roundResultCode) {
    case "Elimination":
      return `/matchOutcomes/elimination${outcomeSuffix}.png`;
    case "Detonate":
      return `/matchOutcomes/explosion${outcomeSuffix}.png`;
    case "Defuse":
      return `/matchOutcomes/diffuse${outcomeSuffix}.png`;
    case "TimeExpired":
      return `/matchOutcomes/time${outcomeSuffix}.png`;
    case "Surrendered":
      return `/matchOutcomes/EarlySurrender_Flag.png`;
    default:
      return `/matchOutcomes/${roundResultCode.toLowerCase()}${outcomeSuffix}.png`;
  }
};

const MatchesPage = () => {
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [selectedRoundByMatch, setSelectedRoundByMatch] = useState<
    Record<string, number>
  >({});
  const { user: firebaseUser, loading: authLoading } = useFirebaseAuth();
  const { data: userProfile, isLoading: isUserLoading } = useUser();
  const isRSOUser = Boolean(userProfile?.rsoSubjectId) && userProfile?.id === 5;
  const canLoadMatches = Boolean(firebaseUser && isRSOUser);

  const toggleExpanded = (matchId: string) => {
    setExpandedMatchId((current) => {
      const next = current === matchId ? null : matchId;
      if (next) {
        setSelectedRoundByMatch((prev) => ({
          ...prev,
          [next]: prev[next] ?? 1,
        }));
      }
      return next;
    });
  };

  const selectRound = (matchId: string, roundNumber: number) => {
    setSelectedRoundByMatch((prev) => ({
      ...prev,
      [matchId]: roundNumber,
    }));
  };

  const {
    data,
    isLoading: isMatchesLoading,
    isError,
    error,
    refetch,
  } = useMatches(canLoadMatches, 10);
  const {
    data: expandedMatchSummary,
    isLoading: isMatchSummaryLoading,
    isError: isMatchSummaryError,
    error: matchSummaryError,
    refetch: refetchMatchSummary,
  } = useMatchSummary(expandedMatchId, canLoadMatches && !!expandedMatchId);

  if (authLoading || isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin" />
          <p className="text-muted-foreground font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (isMatchesLoading && canLoadMatches) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin" />
          <p className="text-muted-foreground font-medium">
            Loading matches...
          </p>
        </div>
      </div>
    );
  }

  if (isError && canLoadMatches) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md space-y-4 w-full">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to load matches</AlertTitle>
            <AlertDescription>
              {error?.message || "Something went wrong while loading matches."}
            </AlertDescription>
          </Alert>
          <Button onClick={() => refetch()}>Try Again</Button>
        </div>
      </div>
    );
  }

  const matches = data?.matches ?? [];

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="mx-auto w-full max-w-[1260px] px-3 sm:px-4">
        <div className="mb-4 flex items-center justify-end">
          <Button variant="outline" size="sm" asChild>
            <Link href="/">Back Home</Link>
          </Button>
        </div>

        {!firebaseUser && (
          <Alert className="mb-4">
            <AlertTitle>Sign in required</AlertTitle>
            <AlertDescription>
              Sign in to load your recent matches.
            </AlertDescription>
          </Alert>
        )}

        {firebaseUser && !isRSOUser && (
          <Alert className="mb-4">
            <AlertTitle>Riot account required</AlertTitle>
            <AlertDescription>
              This page is only available for Riot Sign-On users.
            </AlertDescription>
          </Alert>
        )}

        {matches.length === 0 ? (
          <Alert>
            <AlertTitle>No matches found</AlertTitle>
            <AlertDescription>
              No competitive or unrated matches were found for your account yet.
            </AlertDescription>
          </Alert>
        ) : (
          <section className="space-y-px">
            {matches.map((match) => {
              const matchSummary =
                expandedMatchId === match.matchId ? expandedMatchSummary : null;
              const players = matchSummary?.players ?? [];
              const currentPlayerPuuid = matchSummary?.viewer.puuid;
              const currentPlayerBestRoundNumber =
                matchSummary?.viewer.bestRoundNumber;
              const currentPlayerTeamId = getPlayerSummary(
                players,
                currentPlayerPuuid,
              )?.teamId;
              const selectedRoundNumber =
                selectedRoundByMatch[match.matchId] ??
                matchSummary?.rounds[0]?.roundNumber ??
                1;
              const selectedRound = matchSummary?.rounds.find(
                (round: MatchSummaryResponse["rounds"][number]) =>
                  round.roundNumber === selectedRoundNumber,
              );

              return (
                <div key={match.matchId}>
                  <article
                    onClick={() => toggleExpanded(match.matchId)}
                    className="relative isolate mb-1.5 h-[108px] cursor-pointer overflow-hidden bg-[#10243a]/50 backdrop-blur-[1px] sm:h-28"
                  >
                    <div
                      className={`absolute left-0 top-0 z-40 h-full w-1 ${
                        match.result === "Win" ? "bg-[#42EEC7]" : "bg-[#FF4655]"
                      }`}
                    />

                    <div
                      className="absolute inset-y-0 right-0 w-[46%]"
                      style={{
                        maskImage:
                          "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 28%, rgba(0,0,0,0.55) 52%, black 78%)",
                        WebkitMaskImage:
                          "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 28%, rgba(0,0,0,0.55) 52%, black 78%)",
                      }}
                    >
                      <Image
                        src={getMapImageSrc(match.mapName)}
                        alt={match.mapName}
                        fill
                        sizes="(max-width: 640px) 85vw, (max-width: 1024px) 50vw, 46vw"
                        loading="eager"
                        className="object-cover object-center"
                      />
                    </div>

                    <div
                      className={`absolute inset-y-0 left-0 w-full ${
                        match.result === "Win"
                          ? "bg-linear-to-r from-[#133b43]/72 via-[#124c58]/58 to-transparent"
                          : "bg-linear-to-r from-[#3a1f33]/72 via-[#2b2240]/58 to-transparent"
                      }`}
                    />

                    <div className="relative z-30 flex h-full items-center pl-1">
                      <div className="relative aspect-square h-full shrink-0">
                        <Image
                          src={getAgentImageSrc(match.agentName)}
                          alt={match.agentName || "Agent"}
                          fill
                          sizes="(min-width: 640px) 96px, 84px"
                          className="object-contain"
                        />
                      </div>

                      <div className="flex min-w-0 flex-1 items-center gap-1.5 px-1.5 pr-[36%] sm:gap-2 sm:px-3 sm:pr-[35%] lg:gap-3 lg:px-5 lg:pr-[30%]">
                        <div className="min-w-0">
                          <div className="grid grid-cols-[auto_auto] items-baseline gap-x-1.5 gap-y-1.5 sm:grid-cols-[auto_1fr] sm:gap-x-2">
                            <span className="whitespace-nowrap text-[11px] font-semibold uppercase leading-none tracking-[0.05em] text-white sm:text-[18px] lg:text-[28px]">
                              KDA
                            </span>
                            <span className="whitespace-nowrap text-[11px] font-semibold uppercase leading-none tracking-[0.04em] text-white sm:text-[18px] lg:text-[28px]">
                              {match.kills} / {match.deaths} / {match.assists}
                            </span>
                            <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.05em] text-white/55 sm:text-[12px] lg:text-[16px]">
                              SCORE
                            </span>
                            <span className="whitespace-nowrap text-[10px] font-semibold uppercase leading-none tracking-[0.05em] text-white sm:text-[12px] lg:text-[16px]">
                              {match.personalScore}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="absolute right-1 top-1/2 z-40 w-[34%] -translate-y-1/2 text-right sm:right-2 sm:w-[32%] lg:left-1/2 lg:right-auto lg:w-[30%] lg:-translate-x-1/2 lg:text-center">
                        <p
                          className={`text-[16px] font-semibold uppercase leading-none tracking-[0.04em] sm:text-[24px] lg:text-[36px] ${
                            match.result === "Win"
                              ? "text-[#42EEC7]"
                              : "text-[#FF4655]"
                          }`}
                        >
                          {getResultLabel(match.result)}
                        </p>
                        <p className="mt-0.5 text-[20px] font-semibold leading-none tracking-[0.03em] text-white sm:mt-1 sm:text-[24px] lg:mt-2 lg:text-[32px]">
                          <span
                            className={
                              match.result === "Win" ? "text-[#42EEC7]" : ""
                            }
                          >
                            {match.teamScore}
                          </span>
                          {" - "}
                          <span
                            className={
                              match.result === "Loss" ? "text-[#FF4655]" : ""
                            }
                          >
                            {match.enemyScore}
                          </span>
                        </p>
                      </div>
                    </div>
                  </article>
                  {expandedMatchId === match.matchId &&
                    isMatchSummaryLoading && (
                      <section className="rounded-b-xl border border-slate-700 bg-slate-950/90 px-4 py-8 sm:px-5">
                        <div className="flex items-center justify-center gap-3 text-slate-200">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span className="text-sm font-medium">
                            Loading match summary...
                          </span>
                        </div>
                      </section>
                    )}
                  {expandedMatchId === match.matchId && isMatchSummaryError && (
                    <section className="rounded-b-xl border border-slate-700 bg-slate-950/90 px-4 py-4 sm:px-5">
                      <div className="space-y-3">
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Failed to load match summary</AlertTitle>
                          <AlertDescription>
                            {matchSummaryError?.message ||
                              "Something went wrong while loading the selected match."}
                          </AlertDescription>
                        </Alert>
                        <Button size="sm" onClick={() => refetchMatchSummary()}>
                          Try Again
                        </Button>
                      </div>
                    </section>
                  )}
                  {expandedMatchId === match.matchId &&
                    selectedRound &&
                    matchSummary && (
                      <section className="rounded-b-xl border border-slate-700 bg-slate-950/90 px-4 py-4 sm:px-5">
                        <div className="space-y-4">
                          <ScrollArea className="w-full pb-1">
                            <div className="inline-flex min-w-full gap-2">
                              {matchSummary.rounds.map(
                                (
                                  round: MatchSummaryResponse["rounds"][number],
                                ) => {
                                  const isSelected =
                                    round.roundNumber ===
                                    selectedRound.roundNumber;
                                  const roundButton = (
                                    <button
                                      key={`round-${round.roundNumber}`}
                                      type="button"
                                      onClick={() =>
                                        selectRound(
                                          match.matchId,
                                          round.roundNumber,
                                        )
                                      }
                                      className={`h-16 min-w-14 shrink-0 text-sm font-semibold transition-colors ${
                                        isSelected
                                          ? "border-[#42EEC7] text-[#42EEC7] border-2 bg-linear-to-t from-[#42EEC7]/48 via-[#42EEC7]/24 to-transparent"
                                          : "bg-slate-900/45 text-slate-300 hover:border-[#42EEC7] hover:border-2"
                                      }`}
                                    >
                                      <span className="flex h-full flex-col items-center justify-center gap-4 leading-none">
                                        <span className="text-[14px] font-semibold uppercase tracking-[0.08em]">
                                          {round.roundNumber}
                                        </span>
                                        <Image
                                          src={getRoundOutcomeIconSrc(
                                            round.roundResultCode,
                                            round.winningTeam,
                                            currentPlayerTeamId,
                                            round.roundNumber ===
                                              (currentPlayerBestRoundNumber ??
                                                -1),
                                          )}
                                          alt={`${round.roundResultCode} icon`}
                                          width={20}
                                          height={20}
                                          className="h-5 w-5"
                                        />
                                      </span>
                                    </button>
                                  );

                                  if (round.roundNumber !== 12) {
                                    return roundButton;
                                  }

                                  return [
                                    roundButton,
                                    <span
                                      key="round-half-separator"
                                      aria-hidden="true"
                                      className="inline-flex h-16 min-w-8 shrink-0 items-center justify-center text-white"
                                    >
                                      <RefreshCw
                                        className="h-5 w-5"
                                        strokeWidth={3}
                                      />
                                    </span>,
                                  ];
                                },
                              )}
                            </div>
                            <ScrollBar orientation="horizontal" />
                          </ScrollArea>

                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-lg font-semibold text-white uppercase sm:text-xl">
                              Round {selectedRound.roundNumber}
                              <span className="px-1 font-normal">|</span>
                              <span
                                className={`inline-flex min-w-0 flex-wrap items-center gap-1 sm:gap-2 font-semibold ${
                                  currentPlayerTeamId
                                    ? selectedRound.winningTeam ===
                                      currentPlayerTeamId
                                      ? "text-[#42EEC7]"
                                      : "text-[#FF4655]"
                                    : "text-white"
                                }`}
                              >
                                <Image
                                  src={getRoundOutcomeIconSrc(
                                    selectedRound.roundResultCode,
                                    selectedRound.winningTeam,
                                    currentPlayerTeamId,
                                    false,
                                  )}
                                  alt={`${selectedRound.roundResultCode} icon`}
                                  width={24}
                                  height={24}
                                  className="h-4 w-4 shrink-0 sm:h-6 sm:w-6"
                                />
                                <span className="text-base leading-tight sm:text-xl">
                                  (
                                  {getRoundOutcomeText(
                                    selectedRound.roundResultCode,
                                    selectedRound.winningTeam,
                                    currentPlayerTeamId,
                                  )}
                                  )
                                </span>
                                {selectedRound.roundNumber ===
                                  currentPlayerBestRoundNumber && (
                                  <span className="block w-full text-base leading-tight text-amber-100 sm:inline sm:w-auto sm:text-xl">
                                    (Your Best Round)
                                  </span>
                                )}
                              </span>
                            </div>
                            <Button size="sm">Load Round</Button>
                          </div>

                          <div className="grid gap-3 md:grid-cols-[1fr_280px]">
                            <div className="min-w-0">
                              <ScrollArea className="w-full">
                                <div className="min-w-[640px] pr-2 sm:min-w-[720px]">
                                  <div className="mb-2 grid grid-cols-[48px_minmax(140px,1fr)_64px_44px_44px_44px_100px] items-center text-[11px] font-semibold uppercase tracking-[0.1em] text-white/55 sm:grid-cols-[56px_minmax(172px,1fr)_80px_52px_52px_52px_120px] sm:text-[12px]">
                                    <span className="text-center">Player</span>
                                    <span aria-hidden="true" />
                                    <span className="text-center">Score</span>
                                    <span className="text-center">K</span>
                                    <span className="text-center">D</span>
                                    <span className="text-center">A</span>
                                    <span className="text-center">Econ</span>
                                  </div>

                                  {selectedRound.playerStats.flatMap(
                                    (
                                      stats: MatchSummaryResponse["rounds"][number]["playerStats"][number],
                                      index: number,
                                      allStats: MatchSummaryResponse["rounds"][number]["playerStats"],
                                    ) => {
                                      const player = getPlayerSummary(
                                        players,
                                        stats.puuid,
                                      );
                                      const isCurrentPlayer =
                                        stats.puuid === currentPlayerPuuid;
                                      const isBlueTeam =
                                        player?.teamId === "Blue";

                                      const rowAccent = isCurrentPlayer
                                        ? "bg-[#facc15]"
                                        : isBlueTeam
                                          ? "bg-[#42EEC7]"
                                          : "bg-[#FF4655]";

                                      const iconShade = isCurrentPlayer
                                        ? "bg-[#6a5817]"
                                        : isBlueTeam
                                          ? "bg-[#19ac92]"
                                          : "bg-[#c65063]";

                                      const identityShade = isCurrentPlayer
                                        ? "bg-[#998c6180]"
                                        : isBlueTeam
                                          ? "bg-[#19ac9280]"
                                          : "bg-[#c6506380]";

                                      const scoreShade = isCurrentPlayer
                                        ? "bg-[#665d4080]"
                                        : isBlueTeam
                                          ? "bg-[#21999980]"
                                          : "bg-[#a0415080]";

                                      const statsShade = isCurrentPlayer
                                        ? "bg-[#584f3680]"
                                        : isBlueTeam
                                          ? "bg-[#19767480]"
                                          : "bg-[#3f2d3f80]";

                                      const nextStats = allStats[index + 1];
                                      const nextTeamId = nextStats
                                        ? getPlayerSummary(
                                            players,
                                            nextStats.puuid,
                                          )?.teamId
                                        : undefined;
                                      const shouldInsertTeamGap =
                                        player?.teamId === "Blue" &&
                                        nextTeamId === "Red";

                                      const row = (
                                        <article
                                          key={stats.puuid}
                                          className="relative isolate overflow-hidden border border-slate-800/80 mb-1"
                                        >
                                          <div
                                            className={`absolute inset-y-0 left-0 w-1.5 ${rowAccent}`}
                                          />

                                          <div className="relative z-30 pl-2">
                                            <div className="grid grid-cols-[48px_minmax(140px,1fr)_64px_44px_44px_44px_100px] items-stretch sm:grid-cols-[56px_minmax(172px,1fr)_80px_52px_52px_52px_120px]">
                                              <div
                                                className={`relative overflow-hidden ${iconShade}`}
                                              >
                                                <div className="relative h-full min-h-12 w-full sm:min-h-14">
                                                  <Image
                                                    src={getAgentImageSrc(
                                                      player?.characterName ??
                                                        "Astra",
                                                    )}
                                                    alt={
                                                      player?.characterName ??
                                                      "Agent"
                                                    }
                                                    fill
                                                    sizes="56px"
                                                    className="object-fill"
                                                  />
                                                </div>
                                              </div>

                                              <div
                                                className={`min-w-0 px-2 py-2 sm:px-3 sm:py-2.5 ${identityShade}`}
                                              >
                                                <div className="min-w-0">
                                                  <p className="truncate text-base font-semibold leading-none text-white sm:text-lg">
                                                    {player?.gameName ??
                                                      "Player"}
                                                  </p>
                                                  <p className="mt-1 truncate text-xs font-semibold leading-none text-white/55 sm:text-sm">
                                                    {player?.characterName ??
                                                      "Unknown Agent"}
                                                  </p>
                                                </div>
                                              </div>

                                              <p
                                                className={`flex items-center justify-center text-center text-base font-semibold text-white sm:text-lg ${scoreShade}`}
                                              >
                                                {stats.score}
                                              </p>

                                              <p
                                                className={`flex items-center justify-center text-center text-base font-semibold text-white sm:text-lg ${statsShade}`}
                                              >
                                                {stats.kills}
                                              </p>
                                              <p
                                                className={`flex items-center justify-center text-center text-base font-semibold text-white sm:text-lg ${statsShade}`}
                                              >
                                                {stats.deaths}
                                              </p>
                                              <p
                                                className={`flex items-center justify-center text-center text-base font-semibold text-white sm:text-lg ${statsShade}`}
                                              >
                                                {stats.assists}
                                              </p>
                                              <div
                                                className={`flex flex-col items-center justify-center text-center leading-tight ${statsShade}`}
                                              >
                                                <p className="text-base font-semibold text-white sm:text-lg">
                                                  {stats.economy.loadoutValue}
                                                </p>
                                                <p className="text-base font-semibold text-white/55 sm:text-lg">
                                                  {stats.economy.remaining}
                                                </p>
                                              </div>
                                            </div>
                                          </div>
                                        </article>
                                      );

                                      if (!shouldInsertTeamGap) {
                                        return [row];
                                      }

                                      return [
                                        row,
                                        <div
                                          key={`team-gap-${stats.puuid}`}
                                          className="h-1.5"
                                          aria-hidden="true"
                                        />,
                                      ];
                                    },
                                  )}
                                </div>
                                <ScrollBar orientation="horizontal" />
                              </ScrollArea>
                            </div>

                            <div>
                              <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-white/55">
                                Event Log
                              </p>
                              <ScrollArea className="h-[360px] w-full">
                                <ol className="space-y-1 pr-2">
                                  {selectedRound.eventLog.map(
                                    (
                                      event: MatchSummaryResponse["rounds"][number]["eventLog"][number],
                                      index: number,
                                    ) =>
                                      renderRoundEventRow(
                                        event,
                                        index,
                                        players,
                                      ),
                                  )}
                                </ol>
                                <ScrollBar orientation="vertical" />
                              </ScrollArea>
                            </div>
                          </div>
                        </div>
                      </section>
                    )}
                </div>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
};

export default MatchesPage;
