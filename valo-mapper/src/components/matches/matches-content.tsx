import { useMatchSummary } from "@/hooks/api/use-match-summary";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MatchCard } from "@/components/matches/match-card";
import { MatchDetails } from "@/components/matches/match-details";
import { ALL_MATCH_QUEUE_FILTER } from "@/lib/consts";
import { MatchQueueFilter, MatchPreview } from "@/lib/types";
import { AlertCircle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

interface MatchesContentProps {
  matches: MatchPreview[];
  totalMatches: number;
  queueFilter: MatchQueueFilter;
  expandedMatchIds: string[];
  hasMoreMatches: boolean;
  isFetchingNextMatches: boolean;
  isFetchNextMatchesError: boolean;
  selectedRoundByMatch: Record<string, number>;
  onExpandedMatchesChange: (matchIds: string[]) => void;
  onSelectRound: (matchId: string, roundNumber: number) => void;
  onLoadMoreMatches: () => void | Promise<unknown>;
}

interface MatchAccordionItemProps {
  match: MatchPreview;
  isExpanded: boolean;
  selectedRoundNumber: number;
  onSelectRound: (matchId: string, roundNumber: number) => void;
}

const MatchAccordionItem = ({
  match,
  isExpanded,
  selectedRoundNumber,
  onSelectRound,
}: MatchAccordionItemProps) => {
  const {
    data: matchSummary,
    isLoading,
    isError,
    error,
    refetch,
  } = useMatchSummary(match.matchId, isExpanded);

  return (
    <AccordionItem value={match.matchId} className="border-none">
      <AccordionTrigger asChild showChevron={false} unstyled>
        <MatchCard match={match} />
      </AccordionTrigger>

      <AccordionContent bodyClassName="p-0" className="overflow-hidden">
        <div
          className={`transition-[opacity,transform] duration-200 ease-out ${
            isExpanded
              ? "translate-y-0 opacity-100"
              : "-translate-y-1 opacity-0"
          }`}
        >
          <MatchDetails
            matchId={match.matchId}
            matchSummary={matchSummary ?? null}
            isLoading={isLoading}
            isError={isError}
            error={error}
            onRetry={refetch}
            selectedRoundNumber={selectedRoundNumber}
            onSelectRound={(roundNumber) =>
              onSelectRound(match.matchId, roundNumber)
            }
          />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};

export const MatchesContent = ({
  matches,
  totalMatches,
  queueFilter,
  expandedMatchIds,
  hasMoreMatches,
  isFetchingNextMatches,
  isFetchNextMatchesError,
  selectedRoundByMatch,
  onExpandedMatchesChange,
  onSelectRound,
  onLoadMoreMatches,
}: MatchesContentProps) => {
  const t = useTranslations("matchesContent");
  const tq = useTranslations("matches");
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);
  const expandedMatchIdSet = new Set(expandedMatchIds);

  useEffect(() => {
    if (!hasMoreMatches || isFetchingNextMatches) {
      return;
    }

    const trigger = loadMoreTriggerRef.current;
    if (!trigger || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void onLoadMoreMatches();
        }
      },
      { rootMargin: "320px 0px" },
    );

    observer.observe(trigger);

    return () => observer.disconnect();
  }, [hasMoreMatches, isFetchingNextMatches, onLoadMoreMatches]);

  const queueName =
    queueFilter === ALL_MATCH_QUEUE_FILTER
      ? tq("queueAll")
      : queueFilter === "Competitive"
        ? tq("queueCompetitive")
        : queueFilter === "Unrated"
          ? tq("queueUnrated")
          : tq("queueCustom");

  const queueSummaryText =
    queueFilter === ALL_MATCH_QUEUE_FILTER
      ? t("showing", { loaded: matches.length, total: totalMatches })
      : hasMoreMatches
        ? t("showingLoaded", { loaded: matches.length, queue: queueName })
        : t("showingFiltered", {
            loaded: matches.length,
            total: matches.length,
            queue: queueName,
          });

  const emptyFilterTitle =
    queueFilter === ALL_MATCH_QUEUE_FILTER
      ? t("noMatches")
      : t("noFilterMatches", { queue: queueName });

  const emptyFilterDescription = hasMoreMatches
    ? queueFilter === ALL_MATCH_QUEUE_FILTER
      ? t("loadMoreToSearchAll")
      : t("loadMoreToSearchQueue", { queue: queueName })
    : queueFilter === ALL_MATCH_QUEUE_FILTER
      ? t("comeBackAll")
      : t("comeBackQueue", { queue: queueName });

  return (
    <section className="space-y-px">
      {matches.length === 0 ? (
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/75 px-4 py-6 text-center">
          <p className="text-base font-semibold text-white">
            {emptyFilterTitle}
          </p>
          <p className="mt-2 text-sm text-white/60">{emptyFilterDescription}</p>
        </div>
      ) : (
        <Accordion
          type="multiple"
          value={expandedMatchIds}
          onValueChange={onExpandedMatchesChange}
          className="space-y-px"
        >
          {matches.map((match) => (
            <MatchAccordionItem
              key={match.matchId}
              match={match}
              isExpanded={expandedMatchIdSet.has(match.matchId)}
              selectedRoundNumber={selectedRoundByMatch[match.matchId] ?? 1}
              onSelectRound={onSelectRound}
            />
          ))}
        </Accordion>
      )}

      <div className="flex flex-col items-center gap-3 px-4 py-6 text-center">
        <p className="text-sm text-muted-foreground">{queueSummaryText}</p>

        {hasMoreMatches ? (
          <>
            <div ref={loadMoreTriggerRef} className="h-px w-full" aria-hidden />
            <Button
              variant="outline"
              onClick={() => void onLoadMoreMatches()}
              disabled={isFetchingNextMatches}
            >
              {isFetchingNextMatches ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("loadingMore")}
                </>
              ) : (
                t("loadMore")
              )}
            </Button>
          </>
        ) : totalMatches > 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("allLoaded")}
          </p>
        ) : null}

        {isFetchNextMatchesError ? (
          <p className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {t("unableMore")}
          </p>
        ) : null}
      </div>
    </section>
  );
};
