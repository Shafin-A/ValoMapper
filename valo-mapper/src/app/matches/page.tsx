"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useMatches } from "@/hooks/api/use-matches";
import { useUser } from "@/hooks/api/use-user";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { MatchPreview } from "@/lib/types";
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

const MatchesPage = () => {
  const { user: firebaseUser, loading: authLoading } = useFirebaseAuth();
  const { data: userProfile, isLoading: isUserLoading } = useUser();
  const isRSOUser = Boolean(userProfile?.rsoSubjectId) && userProfile?.id === 5;
  const useMockData = !firebaseUser || !isRSOUser;

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
            {matches.map((match) => (
              <article
                key={match.matchId}
                className="relative isolate mb-1.5 h-[108px] overflow-hidden bg-[#10243a]/50 backdrop-blur-[1px] sm:h-28"
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
            ))}
          </section>
        )}
      </div>
    </div>
  );
};

export default MatchesPage;
