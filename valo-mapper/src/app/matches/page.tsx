"use client";

import { MatchesContent } from "@/components/matches/matches-content";
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
    hasMoreMatches,
    isFetchingNextMatches,
    isFetchNextMatchesError,
    fetchNextMatchesPage,
    expandedMatchId,
    expandedMatchSummary,
    isMatchSummaryLoading,
    isMatchSummaryError,
    matchSummaryError,
    refetchMatchSummary,
    selectedRoundByMatch,
    toggleExpanded,
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
          <MatchesContent
            matches={matches}
            totalMatches={totalMatches}
            expandedMatchId={expandedMatchId}
            expandedMatchSummary={expandedMatchSummary}
            isMatchSummaryLoading={isMatchSummaryLoading}
            isMatchSummaryError={isMatchSummaryError}
            matchSummaryError={matchSummaryError}
            hasMoreMatches={hasMoreMatches}
            isFetchingNextMatches={isFetchingNextMatches}
            isFetchNextMatchesError={isFetchNextMatchesError}
            selectedRoundByMatch={selectedRoundByMatch}
            onToggleMatch={toggleExpanded}
            onSelectRound={selectRound}
            onRetryMatchSummary={refetchMatchSummary}
            onLoadMoreMatches={fetchNextMatchesPage}
          />
        )}
      </div>
    </div>
  );
};

export default MatchesPage;
