"use client";

import { MatchesContent } from "@/components/matches/matches-content";
import { MATCH_QUEUE_FILTER_OPTIONS } from "@/lib/consts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useMatchesPage } from "@/hooks/use-matches-page";
import { AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";

const MatchesPage = () => {
  const {
    firebaseUser,
    isRSOUser,
    canLoadMatches,
    isPageLoading,
    matches,
    totalMatches,
    isMatchesLoading,
    isMatchesError,
    matchesError,
    refetchMatches,
    queueFilter,
    selectQueueFilter,
    hasMoreMatches,
    isFetchingNextMatches,
    isFetchNextMatchesError,
    fetchNextMatchesPage,
    expandedMatchIds,
    setExpandedMatches,
    selectedRoundByMatch,
    selectRound,
  } = useMatchesPage();

  if (isPageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin" />
          <p className="text-muted-foreground font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (isMatchesLoading && canLoadMatches && matches.length === 0) {
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

  if (isMatchesError && canLoadMatches && matches.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md space-y-4 w-full">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to load matches</AlertTitle>
            <AlertDescription>
              {matchesError?.message ||
                "Something went wrong while loading matches."}
            </AlertDescription>
          </Alert>
          <Button onClick={() => refetchMatches()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="mx-auto w-full max-w-[1260px] px-3 sm:px-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          {canLoadMatches && totalMatches > 0 ? (
            <div className="w-full max-w-60 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/55">
                Queue
              </p>
              <Select value={queueFilter} onValueChange={selectQueueFilter}>
                <SelectTrigger className="w-full border-slate-700 bg-slate-950/80 text-white">
                  <SelectValue placeholder="Select a queue" />
                </SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-950 text-white">
                  {MATCH_QUEUE_FILTER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div />
          )}

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

        {canLoadMatches && totalMatches === 0 ? (
          <Alert>
            <AlertTitle>No matches found</AlertTitle>
            <AlertDescription>
              No competitive or unrated matches were found for your account yet.
            </AlertDescription>
          </Alert>
        ) : canLoadMatches && totalMatches > 0 ? (
          <MatchesContent
            matches={matches}
            totalMatches={totalMatches}
            queueFilter={queueFilter}
            expandedMatchIds={expandedMatchIds}
            hasMoreMatches={hasMoreMatches}
            isFetchingNextMatches={isFetchingNextMatches}
            isFetchNextMatchesError={isFetchNextMatchesError}
            selectedRoundByMatch={selectedRoundByMatch}
            onExpandedMatchesChange={setExpandedMatches}
            onSelectRound={selectRound}
            onLoadMoreMatches={fetchNextMatchesPage}
          />
        ) : null}
      </div>
    </div>
  );
};

export default MatchesPage;
