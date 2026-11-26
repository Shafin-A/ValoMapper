"use client";

import { AlertCircle, Loader2, SearchX } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Strategy } from "@/lib/types";
import { StrategyItem } from "./strategy-item";

interface LibraryViewProps {
  items: Strategy[];
  total: number;
  isLoading: boolean;
  isError: boolean;
  error?: Error | null;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  selectionMode: boolean;
  selectedIds: Set<number>;
  folderLabels?: Record<number, string>;
  onToggleSelect: (strategyId: number) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onClearFilters: () => void;
  onRetry: () => void;
  onLoadMore: () => void;
  onRename: (strategy: Strategy, name: string) => void;
  onDelete: (strategy: Strategy) => void;
  onDuplicate: (strategy: Strategy) => void;
  onEditTags: (strategy: Strategy) => void;
  onToggleFavorite: (strategy: Strategy) => void;
}

export const LibraryView = ({
  items,
  total,
  isLoading,
  isError,
  error,
  hasNextPage,
  isFetchingNextPage,
  selectionMode,
  selectedIds,
  folderLabels,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  onClearFilters,
  onRetry,
  onLoadMore,
  onRename,
  onDelete,
  onDuplicate,
  onEditTags,
  onToggleFavorite,
}: LibraryViewProps) => {
  const t = useTranslations("strategies");

  if (isLoading) {
    return (
      <div className="flex flex-wrap justify-center gap-4 sm:justify-start">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton
            key={index}
            className="h-64 w-full max-w-56 rounded-2xl sm:w-56"
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t("libraryLoadFailedTitle")}</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>{error?.message ?? t("libraryLoadFailedDescription")}</p>
          <Button size="sm" variant="outline" onClick={onRetry}>
            {t("retry")}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (items.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchX />
          </EmptyMedia>
          <EmptyTitle>{t("libraryEmptyTitle")}</EmptyTitle>
          <EmptyDescription>{t("libraryEmptyDescription")}</EmptyDescription>
        </EmptyHeader>
        <Button variant="outline" onClick={onClearFilters}>
          {t("clearFilters")}
        </Button>
      </Empty>
    );
  }

  return (
    <div className="space-y-4">
      {selectionMode && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {t("selectedCount", { count: selectedIds.size })}
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onSelectAll}>
              {t("selectAll")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              disabled={selectedIds.size === 0}
            >
              {t("clearSelection")}
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-4 sm:justify-start sm:gap-6">
        {items.map((strategy) => (
          <StrategyItem
            key={strategy.id}
            href={`/${strategy.lobbyCode}`}
            strategyId={`strategy-${strategy.id}`}
            name={strategy.name}
            selectedMapId={strategy.selectedMapId}
            mapSide={strategy.mapSide}
            tags={strategy.tags}
            isFavorite={strategy.isFavorite}
            folderLabel={
              strategy.folderId
                ? folderLabels?.[strategy.folderId]
                : undefined
            }
            updatedAt={new Date(strategy.updatedAt)}
            currentLocationId={
              strategy.folderId ? `folder-${strategy.folderId}` : "root"
            }
            selectable={selectionMode}
            selected={selectedIds.has(strategy.id)}
            onToggleSelect={() => onToggleSelect(strategy.id)}
            onRename={(name) => onRename(strategy, name)}
            onDelete={() => onDelete(strategy)}
            onDuplicate={() => onDuplicate(strategy)}
            onEditTags={() => onEditTags(strategy)}
            onToggleFavorite={() => onToggleFavorite(strategy)}
          />
        ))}
      </div>

      <div className="flex flex-col items-center gap-2 pt-2">
        <p className="text-xs text-muted-foreground">
          {t("showingCount", { shown: items.length, total })}
        </p>
        {hasNextPage && (
          <Button
            type="button"
            variant="outline"
            onClick={onLoadMore}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage && <Loader2 className="animate-spin" />}
            {t("loadMore")}
          </Button>
        )}
      </div>
    </div>
  );
};
