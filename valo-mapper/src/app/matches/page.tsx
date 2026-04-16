"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMatches } from "@/hooks/api/use-matches";
import { useUser } from "@/hooks/api/use-user";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { AlertCircle, Home, Loader2 } from "lucide-react";
import Link from "next/link";

const formatPlayedAt = (playedAtMillis: number) => {
  if (!playedAtMillis) {
    return "Unknown time";
  }

  const date = new Date(playedAtMillis);
  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const MatchesPage = () => {
  const { user: firebaseUser, loading: authLoading } = useFirebaseAuth();
  const { data: userProfile, isLoading: isUserLoading } = useUser();
  const isRSOUser = Boolean(userProfile?.rsoSubjectId) && userProfile?.id === 5;

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

  if (!firebaseUser) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md space-y-4 w-full">
          <div className="flex justify-end">
            <Button variant="outline" size="icon" asChild>
              <Link href="/">
                <Home className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Authentication Required</AlertTitle>
            <AlertDescription>
              You must be logged in to access your matches.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!isRSOUser) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md space-y-4 w-full">
          <div className="flex justify-end">
            <Button variant="outline" size="icon" asChild>
              <Link href="/">
                <Home className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>RSO Login Required</AlertTitle>
            <AlertDescription>
              This page is only available for Riot Sign-On users.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (isMatchesLoading) {
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

  if (isError) {
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
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Recent Matches</h1>
          <Button variant="outline" size="sm" asChild>
            <Link href="/">Back Home</Link>
          </Button>
        </div>

        {matches.length === 0 ? (
          <Alert>
            <AlertTitle>No matches found</AlertTitle>
            <AlertDescription>
              No competitive or unrated matches were found for your account yet.
            </AlertDescription>
          </Alert>
        ) : (
          matches.map((match) => (
            <Card key={match.matchId}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between gap-2">
                  <span>{match.mapName}</span>
                  <span
                    className={
                      match.result === "Win" ? "text-cyan-600" : "text-red-600"
                    }
                  >
                    {match.result}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                <p>Queue: {match.queueLabel}</p>
                <p>
                  Match Score: {match.teamScore} - {match.enemyScore}
                </p>
                <p>
                  KDA: {match.kills}/{match.deaths}/{match.assists}
                </p>
                <p>Personal Score: {match.personalScore}</p>
                <p>Played: {formatPlayedAt(match.playedAt)}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default MatchesPage;
