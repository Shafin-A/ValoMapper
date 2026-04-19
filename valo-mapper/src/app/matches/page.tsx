"use client";

import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useMatches } from "@/hooks/api/use-matches";
import { useUser } from "@/hooks/api/use-user";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { MatchPreview, MatchSummaryResponse } from "@/lib/types";
import { AlertCircle, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const mockMatches: MatchPreview[] = [
  {
    matchId: "mock-1",
    mapId: "pearl",
    mapName: "Pearl",
    result: "Win",
    queueLabel: "Competitive",
    teamScore: 13,
    enemyScore: 8,
    kills: 17,
    deaths: 4,
    assists: 5,
    personalScore: 5731,
    agentId: "jett",
    agentName: "Jett",
    playedAt: Date.now() - 1000 * 60 * 45,
  },
  {
    matchId: "mock-2",
    mapId: "split",
    mapName: "Split",
    result: "Loss",
    queueLabel: "Unrated",
    teamScore: 7,
    enemyScore: 13,
    kills: 12,
    deaths: 10,
    assists: 6,
    personalScore: 2388,
    agentId: "breach",
    agentName: "Breach",
    playedAt: Date.now() - 1000 * 60 * 120,
  },
  {
    matchId: "mock-3",
    mapId: "haven",
    mapName: "Haven",
    result: "Win",
    queueLabel: "Competitive",
    teamScore: 13,
    enemyScore: 11,
    kills: 21,
    deaths: 8,
    assists: 8,
    personalScore: 6419,
    agentId: "jett",
    agentName: "Jett",
    playedAt: Date.now() - 1000 * 60 * 300,
  },
];

const getAgentImageSrc = (agentId: string) => {
  const normalized = (agentId || "astra").toLowerCase();
  return `/agents/${normalized}/${normalized}.png`;
};

const getMapImageSrc = (mapName: string) => {
  const normalized = (mapName || "ascent").toLowerCase().replace(/\s+/g, "");
  return `/maps/listviewicons/${normalized}.webp`;
};

const getResultLabel = (result: MatchPreview["result"]) => {
  return result === "Win" ? "Victory" : "Defeat";
};

const mockMatchSummary: MatchSummaryResponse = {
  schemaVersion: "matches-summary.v1",
  matchId: "mock-1",
  mapId: "pearl",
  mapName: "Pearl",
  queueLabel: "Competitive",
  gameStartAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  viewer: {
    puuid: "player-2",
    bestRoundNumber: 4,
  },
  totalRounds: 4,
  players: [
    {
      puuid: "player-1",
      gameName: "Sova",
      tagLine: "#NA",
      teamId: "Blue",
      characterId: "sova",
      characterName: "Sova",
    },
    {
      puuid: "player-2",
      gameName: "Jett",
      tagLine: "#NA",
      teamId: "Blue",
      characterId: "jett",
      characterName: "Jett",
    },
    {
      puuid: "player-3",
      gameName: "Breach",
      tagLine: "#EU",
      teamId: "Red",
      characterId: "breach",
      characterName: "Breach",
    },
    {
      puuid: "player-4",
      gameName: "Killjoy",
      tagLine: "#EU",
      teamId: "Red",
      characterId: "killjoy",
      characterName: "Killjoy",
    },
  ],
  rounds: [
    {
      roundNumber: 1,
      winningTeam: "Blue",
      roundResultCode: "Elimination",
      scoreAfterRound: { red: 0, blue: 1 },
      playerStats: [
        {
          puuid: "player-1",
          score: 250,
          kills: 1,
          deaths: 0,
          assists: 1,
          economy: { loadoutValue: 3000, remaining: 650 },
        },
        {
          puuid: "player-2",
          score: 220,
          kills: 2,
          deaths: 0,
          assists: 0,
          economy: { loadoutValue: 2800, remaining: 850 },
        },
        {
          puuid: "player-3",
          score: 40,
          kills: 0,
          deaths: 1,
          assists: 0,
          economy: { loadoutValue: 1800, remaining: 1200 },
        },
        {
          puuid: "player-4",
          score: 10,
          kills: 0,
          deaths: 2,
          assists: 0,
          economy: { loadoutValue: 1900, remaining: 950 },
        },
      ],
      eventLog: [
        {
          eventType: "kill",
          timeSinceRoundStartMillis: 12000,
          killerPuuid: "player-2",
          victimPuuid: "player-4",
          weaponId: "vandal",
          weaponName: "Vandal",
          assistantPuuids: ["player-1"],
        },
        {
          eventType: "spike_planted",
          timeSinceRoundStartMillis: 95000,
          planterPuuid: "player-3",
        },
        {
          eventType: "spike_defused",
          timeSinceRoundStartMillis: 175000,
          defuserPuuid: "player-1",
        },
      ],
    },
    {
      roundNumber: 2,
      winningTeam: "Red",
      roundResultCode: "Elimination",
      scoreAfterRound: { red: 1, blue: 1 },
      playerStats: [
        {
          puuid: "player-1",
          score: 70,
          kills: 0,
          deaths: 1,
          assists: 0,
          economy: { loadoutValue: 3900, remaining: 1450 },
        },
        {
          puuid: "player-2",
          score: 120,
          kills: 1,
          deaths: 1,
          assists: 0,
          economy: { loadoutValue: 4200, remaining: 1050 },
        },
        {
          puuid: "player-3",
          score: 260,
          kills: 2,
          deaths: 0,
          assists: 1,
          economy: { loadoutValue: 4100, remaining: 900 },
        },
        {
          puuid: "player-4",
          score: 200,
          kills: 1,
          deaths: 0,
          assists: 1,
          economy: { loadoutValue: 3800, remaining: 1200 },
        },
      ],
      eventLog: [
        {
          eventType: "kill",
          timeSinceRoundStartMillis: 8000,
          killerPuuid: "player-3",
          victimPuuid: "player-1",
          weaponId: "phantom",
          weaponName: "Phantom",
          assistantPuuids: [],
        },
        {
          eventType: "kill",
          timeSinceRoundStartMillis: 31000,
          killerPuuid: "player-4",
          victimPuuid: "player-2",
          weaponId: "sheriff",
          weaponName: "Sheriff",
          assistantPuuids: ["player-3"],
        },
      ],
    },
    {
      roundNumber: 3,
      winningTeam: "Blue",
      roundResultCode: "Defuse",
      scoreAfterRound: { red: 1, blue: 2 },
      playerStats: [
        {
          puuid: "player-1",
          score: 300,
          kills: 2,
          deaths: 0,
          assists: 0,
          economy: { loadoutValue: 4300, remaining: 700 },
        },
        {
          puuid: "player-2",
          score: 210,
          kills: 1,
          deaths: 1,
          assists: 2,
          economy: { loadoutValue: 3900, remaining: 850 },
        },
        {
          puuid: "player-3",
          score: 60,
          kills: 0,
          deaths: 1,
          assists: 0,
          economy: { loadoutValue: 4200, remaining: 1400 },
        },
        {
          puuid: "player-4",
          score: 45,
          kills: 0,
          deaths: 1,
          assists: 0,
          economy: { loadoutValue: 4200, remaining: 900 },
        },
      ],
      eventLog: [
        {
          eventType: "spike_planted",
          timeSinceRoundStartMillis: 82000,
          planterPuuid: "player-3",
        },
        {
          eventType: "kill",
          timeSinceRoundStartMillis: 102000,
          killerPuuid: "player-1",
          victimPuuid: "player-4",
          weaponId: "operator",
          weaponName: "Operator",
          assistantPuuids: [],
        },
        {
          eventType: "spike_defused",
          timeSinceRoundStartMillis: 126000,
          defuserPuuid: "player-2",
        },
      ],
    },
    {
      roundNumber: 4,
      winningTeam: "Blue",
      roundResultCode: "Elimination",
      scoreAfterRound: { red: 1, blue: 3 },
      playerStats: [
        {
          puuid: "player-1",
          score: 190,
          kills: 1,
          deaths: 0,
          assists: 1,
          economy: { loadoutValue: 2400, remaining: 750 },
        },
        {
          puuid: "player-2",
          score: 265,
          kills: 2,
          deaths: 0,
          assists: 0,
          economy: { loadoutValue: 2200, remaining: 650 },
        },
        {
          puuid: "player-3",
          score: 80,
          kills: 0,
          deaths: 1,
          assists: 0,
          economy: { loadoutValue: 2000, remaining: 900 },
        },
        {
          puuid: "player-4",
          score: 50,
          kills: 0,
          deaths: 2,
          assists: 0,
          economy: { loadoutValue: 1950, remaining: 630 },
        },
      ],
      eventLog: [
        {
          eventType: "kill",
          timeSinceRoundStartMillis: 14000,
          killerPuuid: "player-2",
          victimPuuid: "player-3",
          weaponId: "spectre",
          weaponName: "Spectre",
          assistantPuuids: [],
        },
        {
          eventType: "kill",
          timeSinceRoundStartMillis: 29000,
          killerPuuid: "player-1",
          victimPuuid: "player-4",
          weaponId: "ghost",
          weaponName: "Ghost",
          assistantPuuids: ["player-2"],
        },
      ],
    },
  ],
};

const getPlayerSummary = (puuid: string) => {
  return mockMatchSummary.players.find((player) => player.puuid === puuid);
};

const getPlayerName = (puuid: string) => {
  return getPlayerSummary(puuid)?.gameName ?? "Player";
};

const formatTimeSinceRoundStart = (timeSinceRoundStartMillis: number) => {
  const totalSeconds = Math.floor(timeSinceRoundStartMillis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const formatRoundEvent = (
  event: MatchSummaryResponse["rounds"][number]["eventLog"][number],
) => {
  switch (event.eventType) {
    case "kill":
      return `${getPlayerName(event.killerPuuid)} killed ${getPlayerName(
        event.victimPuuid,
      )} with ${event.weaponName}${
        event.assistantPuuids.length > 0
          ? ` (assist: ${event.assistantPuuids.map(getPlayerName).join(", ")})`
          : ""
      }`;
    case "spike_planted":
      return `${getPlayerName(event.planterPuuid)} planted the spike`;
    case "spike_defused":
      return `${getPlayerName(event.defuserPuuid)} defused the spike`;
    default:
      return "Unknown event";
  }
};

const getRoundOutcomeText = (
  roundResultCode: string,
  winningTeam: string,
  currentPlayerTeamId: string | undefined,
) => {
  const normalizedResult =
    roundResultCode === "TimeExpired" ? "Time Expired" : roundResultCode;

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
  const useMockData = !firebaseUser || !isRSOUser;
  const currentPlayerPuuid = mockMatchSummary.viewer.puuid;
  const currentPlayerBestRoundNumber = mockMatchSummary.viewer.bestRoundNumber;
  const currentPlayerTeamId = getPlayerSummary(currentPlayerPuuid)?.teamId;

  const toggleExpanded = (matchId: string) => {
    setExpandedMatchId((current) => {
      const next = current === matchId ? null : matchId;
      if (next) {
        setSelectedRoundByMatch((prev) => ({
          ...prev,
          [next]: prev[next] ?? mockMatchSummary.rounds[0]?.roundNumber ?? 1,
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
  } = useMatches(Boolean(firebaseUser && isRSOUser), 10);

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

  if (isMatchesLoading && !useMockData) {
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

  if (isError && !useMockData) {
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

  const matches = useMockData ? mockMatches : (data?.matches ?? []);

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="mx-auto w-full max-w-[1260px] px-3 sm:px-4">
        <div className="mb-4 flex items-center justify-end">
          <Button variant="outline" size="sm" asChild>
            <Link href="/">Back Home</Link>
          </Button>
        </div>

        {useMockData && (
          <Alert className="mb-4 border-cyan-500/30 bg-cyan-950/25 text-cyan-100">
            <AlertTitle>Temporary mock data</AlertTitle>
            <AlertDescription>
              Using local mock response for design iteration.
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
              const selectedRoundNumber =
                selectedRoundByMatch[match.matchId] ??
                mockMatchSummary.rounds[0]?.roundNumber ??
                1;
              const selectedRound = mockMatchSummary.rounds.find(
                (round) => round.roundNumber === selectedRoundNumber,
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
                          src={getAgentImageSrc(match.agentId)}
                          alt={match.agentName || "Agent"}
                          fill
                          sizes="(min-width: 640px) 96px, 84px"
                          className="object-contain"
                        />
                      </div>

                      <div className="flex min-w-0 flex-1 items-center gap-3 px-3 sm:px-5">
                        <div className="min-w-0">
                          <div className="grid grid-cols-[auto_1fr] items-baseline gap-x-2 gap-y-1.5">
                            <span className="truncate text-[12px] font-semibold uppercase leading-none tracking-[0.05em] text-white sm:text-[28px]">
                              KDA
                            </span>
                            <span className="truncate text-[12px] font-semibold uppercase leading-none tracking-[0.05em] text-white sm:text-[28px]">
                              {match.kills} / {match.deaths} / {match.assists}
                            </span>
                            <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-white/55 sm:text-[16px]">
                              SCORE
                            </span>
                            <span className="truncate text-[11px] font-semibold uppercase leading-none tracking-[0.05em] text-white sm:text-[16px]">
                              {match.personalScore}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="absolute left-1/2 top-1/2 z-40 w-[42%] -translate-x-1/2 -translate-y-1/2 text-center sm:w-[30%]">
                        <p
                          className={`text-[24px] font-semibold uppercase leading-none tracking-[0.06em] sm:text-[36px] ${
                            match.result === "Win"
                              ? "text-[#42EEC7]"
                              : "text-[#FF4655]"
                          }`}
                        >
                          {getResultLabel(match.result)}
                        </p>
                        <p className="mt-2 text-[30px] font-semibold leading-none tracking-[0.03em] text-white sm:text-[32px]">
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
                  {expandedMatchId === match.matchId && selectedRound && (
                    <section className="rounded-b-xl border border-slate-700 bg-slate-950/90 px-4 py-4 sm:px-5">
                      <div className="space-y-4">
                        <div className="overflow-x-auto pb-1">
                          <div className="inline-flex min-w-full gap-2">
                            {mockMatchSummary.rounds.map((round) => {
                              const isSelected =
                                round.roundNumber === selectedRound.roundNumber;
                              return (
                                <button
                                  key={round.roundNumber}
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
                                          currentPlayerBestRoundNumber,
                                      )}
                                      alt={`${round.roundResultCode} icon`}
                                      width={20}
                                      height={20}
                                      className="h-5 w-5"
                                    />
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="mt-1 flex items-center gap-2 text-xl font-semibold text-white uppercase">
                            Round {selectedRound.roundNumber}
                            <span className="px-1 font-normal">|</span>
                            <span
                              className={`inline-flex items-center gap-2 font-semibold ${
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
                                className="h-6 w-6"
                              />
                              (
                              {getRoundOutcomeText(
                                selectedRound.roundResultCode,
                                selectedRound.winningTeam,
                                currentPlayerTeamId,
                              )}
                              )
                              {selectedRound.roundNumber ===
                                currentPlayerBestRoundNumber && (
                                <span className="text-amber-100">
                                  (Your Best Round)
                                </span>
                              )}
                            </span>
                          </div>
                          <Button size="sm">Load Round</Button>
                        </div>

                        <div className="grid gap-3 md:grid-cols-[1fr_240px]">
                          <div className="min-w-[760px]">
                            <div>
                              <div className="grid grid-cols-[56px_minmax(172px,1fr)_80px_52px_52px_52px_120px] items-center text-[12px] mb-2 font-semibold uppercase tracking-[0.1em] text-white/55">
                                <span className="text-center">Player</span>
                                <span aria-hidden="true" />
                                <span className="text-center">Score</span>
                                <span className="text-center">K</span>
                                <span className="text-center">D</span>
                                <span className="text-center">A</span>
                                <span className="text-center">Econ</span>
                              </div>

                              {selectedRound.playerStats.flatMap(
                                (stats, index, allStats) => {
                                  const player = getPlayerSummary(stats.puuid);
                                  const isCurrentPlayer =
                                    stats.puuid === currentPlayerPuuid;
                                  const isBlueTeam = player?.teamId === "Blue";

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
                                    ? getPlayerSummary(nextStats.puuid)?.teamId
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
                                        <div className="grid grid-cols-[56px_minmax(172px,1fr)_80px_52px_52px_52px_120px] items-stretch">
                                          <div
                                            className={`relative overflow-hidden ${iconShade}`}
                                          >
                                            <div className="relative h-full min-h-14 w-full">
                                              <Image
                                                src={getAgentImageSrc(
                                                  player?.characterId ??
                                                    "astra",
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
                                            className={`min-w-0 px-3 py-2.5 ${identityShade}`}
                                          >
                                            <div className="min-w-0">
                                              <p className="truncate text-lg font-semibold leading-none text-white">
                                                {player?.gameName ?? "Player"}
                                              </p>
                                              <p className="mt-1 truncate text-sm font-semibold leading-none text-white/55">
                                                {player?.characterName ??
                                                  "Unknown Agent"}
                                              </p>
                                            </div>
                                          </div>

                                          <p
                                            className={`flex items-center justify-center text-center text-l font-semibold text-white ${scoreShade}`}
                                          >
                                            {stats.score}
                                          </p>

                                          <p
                                            className={`flex items-center justify-center text-center text-l font-semibold text-white ${statsShade}`}
                                          >
                                            {stats.kills}
                                          </p>
                                          <p
                                            className={`flex items-center justify-center text-center text-l font-semibold text-white ${statsShade}`}
                                          >
                                            {stats.deaths}
                                          </p>
                                          <p
                                            className={`flex items-center justify-center text-center text-l font-semibold text-white ${statsShade}`}
                                          >
                                            {stats.assists}
                                          </p>
                                          <div
                                            className={`flex flex-col items-center justify-center text-center leading-tight ${statsShade}`}
                                          >
                                            <p className="text-l font-semibold text-white">
                                              {stats.economy.loadoutValue}
                                            </p>
                                            <p className="text-l font-semibold text-white/55">
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
                          </div>

                          <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
                            <p className="text-sm font-semibold text-white">
                              Event Log
                            </p>
                            <ol className="mt-3 space-y-2 text-sm text-slate-300">
                              {selectedRound.eventLog.map((event, index) => (
                                <li key={index}>
                                  <span className="text-slate-500">
                                    {formatTimeSinceRoundStart(
                                      event.timeSinceRoundStartMillis,
                                    )}
                                  </span>{" "}
                                  {formatRoundEvent(event)}
                                </li>
                              ))}
                            </ol>
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
