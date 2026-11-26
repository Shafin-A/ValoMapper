"use client";

import { StrategiesContent } from "@/components/strategies/strategies-content";
import { StrategiesHeader } from "@/components/strategies/strategies-header";
import { LibraryToolbar, type StrategyLibraryView } from "@/components/strategies/library-toolbar";
import { LibraryView } from "@/components/strategies/library-view";
import { BulkActionBar } from "@/components/strategies/bulk-action-bar";
import { BulkTagDialog } from "@/components/strategies/bulk-tag-dialog";
import { BulkMoveDialogContent } from "@/components/strategies/bulk-move-dialog-content";
import { BulkDeleteDialog } from "@/components/strategies/bulk-delete-dialog";
import { TagEditorDialog } from "@/components/strategies/tag-editor-dialog";
import { BackToHomeButton } from "@/components/shared/back-to-home-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useBulkDeleteStrategies } from "@/hooks/api/use-bulk-delete-strategies";
import { useBulkUpdateStrategies } from "@/hooks/api/use-bulk-update-strategies";
import { useDeleteStrategy } from "@/hooks/api/use-delete-strategy";
import { useDuplicateStrategy } from "@/hooks/api/use-duplicate-strategy";
import { useFolders } from "@/hooks/api/use-folder";
import { useStrategyLibrary } from "@/hooks/api/use-strategy-library";
import { useStrategyTags } from "@/hooks/api/use-strategy-tags";
import { useUpdateStrategy } from "@/hooks/api/use-update-strategy";
import { useUser } from "@/hooks/api/use-user";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { cn } from "@/lib/cn";
import { FREE_STRATEGY_LIMIT } from "@/lib/consts";
import {
  DEFAULT_STRATEGY_LIBRARY_FILTERS,
  type StrategyLibraryFilters,
} from "@/lib/strategy-library";
import {
  getStrategyCleanupGracePeriod,
  getStrategyRetentionPreview,
  summarizeStrategyNames,
} from "@/lib/strategy-cleanup";
import { convertFolderOrStrategyId } from "@/lib/strategy-tree";
import type { Strategy, StrategyData } from "@/lib/types";
import { AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

const countStrategies = (items: StrategyData[]): number => {
  return items.reduce((total, item) => {
    if (item.type === "strategy") {
      return total + 1;
    }

    if (!item.children || item.children.length === 0) {
      return total;
    }

    return total + countStrategies(item.children);
  }, 0);
};

const walkTree = (
  items: StrategyData[],
  visit: (item: StrategyData) => void,
) => {
  for (const item of items) {
    visit(item);
    if (item.children?.length) {
      walkTree(item.children, visit);
    }
  }
};

type TagTarget = {
  id: number;
  name: string;
  tags: string[];
};

const MyStrategiesPage = () => {
  const t = useTranslations("strategies");
  const format = useFormatter();
  const { user, loading: authLoading } = useFirebaseAuth();
  const { data, isLoading, isError, error, refetch } = useFolders();
  const { data: userProfile, isLoading: isUserProfileLoading } = useUser();

  const rootName = t("rootName");
  const [navigationPath, setNavigationPath] = useState<
    { id: string; name: string }[]
  >([{ id: "root", name: rootName }]);
  const [view, setView] = useState<StrategyLibraryView>("folders");
  const [filters, setFilters] = useState<StrategyLibraryFilters>({
    ...DEFAULT_STRATEGY_LIBRARY_FILTERS,
  });
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [tagTarget, setTagTarget] = useState<TagTarget | null>(null);
  const [bulkTagOpen, setBulkTagOpen] = useState(false);
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const debouncedQuery = useDebouncedValue(filters.query, 300);
  const libraryFilters = useMemo(
    () => ({ ...filters, query: debouncedQuery }),
    [debouncedQuery, filters],
  );
  const library = useStrategyLibrary(libraryFilters, view === "library");
  const { tags: availableTags } = useStrategyTags();
  const duplicateStrategy = useDuplicateStrategy();
  const updateStrategy = useUpdateStrategy();
  const deleteStrategy = useDeleteStrategy();
  const bulkUpdate = useBulkUpdateStrategies();
  const bulkDelete = useBulkDeleteStrategies();

  useEffect(() => {
    setNavigationPath((previous) => {
      if (previous[0]?.name === rootName) return previous;
      return previous.map((part, index) =>
        index === 0 ? { ...part, name: rootName } : part,
      );
    });
  }, [rootName]);

  const treeData = useMemo(() => data || [], [data]);
  const strategyCount = countStrategies(treeData);
  const hasValoMapperPremium = Boolean(userProfile?.isSubscribed);
  const canManageFolders = !isUserProfileLoading && hasValoMapperPremium;
  const premiumTrialDaysLeft =
    typeof userProfile?.premiumTrialDaysLeft === "number" &&
    userProfile.premiumTrialDaysLeft > 0
      ? userProfile.premiumTrialDaysLeft
      : null;

  const subscriptionEndsAt = userProfile?.subscriptionEndedAt
    ? new Date(userProfile.subscriptionEndedAt)
    : null;

  const hasScheduledCancellation =
    hasValoMapperPremium &&
    subscriptionEndsAt !== null &&
    !Number.isNaN(subscriptionEndsAt.getTime()) &&
    subscriptionEndsAt.getTime() > Date.now();

  const strategyCleanupGracePeriod = getStrategyCleanupGracePeriod(
    hasValoMapperPremium,
    subscriptionEndsAt,
  );

  const { kept: keptStrategies, deleted: deletedStrategies } =
    getStrategyRetentionPreview(treeData);

  const { visibleNames: keptStrategyNames } = summarizeStrategyNames(
    keptStrategies,
    FREE_STRATEGY_LIMIT,
  );

  const {
    visibleNames: deletedStrategyNames,
    hiddenCount: hiddenDeletedStrategiesCount,
  } = summarizeStrategyNames(deletedStrategies);

  const keptStrategiesPreview = keptStrategyNames.join(", ");
  const deletedStrategiesPreview = deletedStrategyNames.join(", ");

  const getCurrentItems = (): StrategyData[] => {
    if (navigationPath.length === 1) return treeData;

    let current = treeData;
    for (let i = 1; i < navigationPath.length; i++) {
      const folder = current.find((item) => item.id === navigationPath[i].id);
      if (folder?.children) current = folder.children;
    }
    return current;
  };

  const navigateToFolder = (folderId: string, folderName: string) => {
    setNavigationPath([...navigationPath, { id: folderId, name: folderName }]);
    setView("folders");
    setSelectedIds(new Set());
  };

  const navigateToBreadcrumb = (index: number) => {
    setNavigationPath(navigationPath.slice(0, index + 1));
    setView("folders");
    setSelectedIds(new Set());
  };

  const currentItems = getCurrentItems();
  const currentFolderId =
    navigationPath.length === 1
      ? null
      : convertFolderOrStrategyId(
          navigationPath[navigationPath.length - 1].id,
          "folder",
        );

  const folderLabels = useMemo(() => {
    const labels: Record<number, string> = {};
    walkTree(treeData, (item) => {
      if (item.type === "folder") {
        labels[convertFolderOrStrategyId(item.id, "folder")] = item.name;
      }
    });
    return labels;
  }, [treeData]);

  const treeStrategyById = useMemo(() => {
    const strategies = new Map<number, StrategyData>();
    walkTree(treeData, (item) => {
      if (item.type === "strategy" && item.strategyId) {
        strategies.set(item.strategyId, item);
      }
    });
    return strategies;
  }, [treeData]);

  const libraryById = useMemo(() => {
    const strategies = new Map<number, Strategy>();
    library.items.forEach((strategy) => strategies.set(strategy.id, strategy));
    return strategies;
  }, [library.items]);

  const selectedStrategies = useMemo(
    () =>
      Array.from(selectedIds)
        .map((id) => libraryById.get(id) ?? treeStrategyById.get(id))
        .filter((strategy): strategy is Strategy | StrategyData =>
          Boolean(strategy),
        ),
    [libraryById, selectedIds, treeStrategyById],
  );

  const allSelectedFavorite =
    selectedStrategies.length > 0 &&
    selectedStrategies.every((strategy) => strategy.isFavorite);

  const handleFiltersChange = (patch: Partial<StrategyLibraryFilters>) => {
    setFilters((previous) => ({ ...previous, ...patch }));
    const opensLibrary = [
      "query",
      "tags",
      "favoriteOnly",
      "mapId",
      "side",
      "sort",
    ].some((key) => key in patch);
    if (opensLibrary) {
      setView("library");
    }
    setSelectedIds(new Set());
  };

  const handleClearFilters = () => {
    setFilters({ ...DEFAULT_STRATEGY_LIBRARY_FILTERS });
    setView("folders");
    setSelectedIds(new Set());
  };

  const handleViewChange = (nextView: StrategyLibraryView) => {
    setView(nextView);
    if (nextView === "folders") {
      setFilters({ ...DEFAULT_STRATEGY_LIBRARY_FILTERS });
    }
    setSelectedIds(new Set());
  };

  const handleToggleSelectionMode = () => {
    setSelectionMode((previous) => !previous);
    setSelectedIds(new Set());
  };

  const toggleSelect = (strategyId: number) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(strategyId)) {
        next.delete(strategyId);
      } else {
        next.add(strategyId);
      }
      return next;
    });
  };

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const visibleStrategyIds = useMemo(() => {
    if (view === "library") {
      return library.items.map((strategy) => strategy.id);
    }
    return currentItems.flatMap((item) =>
      item.type === "strategy" && item.strategyId ? [item.strategyId] : [],
    );
  }, [currentItems, library.items, view]);

  const handleSelectAll = () => {
    setSelectedIds(new Set(visibleStrategyIds));
  };

  const openTagEditor = (strategy: {
    id: number;
    name: string;
    tags?: string[];
  }) => {
    setTagTarget({
      id: strategy.id,
      name: strategy.name,
      tags: strategy.tags ?? [],
    });
  };

  const handleTagEditorSave = (tags: string[]) => {
    if (!tagTarget) return;
    updateStrategy.mutate(
      { strategyId: tagTarget.id, tags },
      { onSuccess: () => setTagTarget(null) },
    );
  };

  const handleDuplicate = (strategy: Strategy) => {
    duplicateStrategy.mutate({ strategyId: strategy.id });
  };

  const handleDuplicateTreeItem = (item: StrategyData) => {
    const strategyId =
      item.strategyId ?? convertFolderOrStrategyId(item.id, "strategy");
    duplicateStrategy.mutate({ strategyId });
  };

  const handleToggleFavorite = (strategy: Strategy) => {
    updateStrategy.mutate({
      strategyId: strategy.id,
      isFavorite: !strategy.isFavorite,
      silent: true,
    });
  };

  const handleToggleFavoriteTreeItem = (item: StrategyData) => {
    const strategyId =
      item.strategyId ?? convertFolderOrStrategyId(item.id, "strategy");
    updateStrategy.mutate({
      strategyId,
      isFavorite: !item.isFavorite,
      silent: true,
    });
  };

  const handleEditTagsTreeItem = (item: StrategyData) => {
    const strategyId =
      item.strategyId ?? convertFolderOrStrategyId(item.id, "strategy");
    openTagEditor({
      id: strategyId,
      name: item.name,
      tags: item.tags,
    });
  };

  const handleDelete = (strategy: Strategy) => {
    deleteStrategy.mutate(
      { strategyId: strategy.id },
      {
        onSuccess: () => {
          setSelectedIds((previous) => {
            const next = new Set(previous);
            next.delete(strategy.id);
            return next;
          });
        },
      },
    );
  };

  const handleRename = (strategy: Strategy, name: string) => {
    updateStrategy.mutate({ strategyId: strategy.id, name });
  };

  const handleBulkFavorite = () => {
    if (selectedIds.size === 0) return;
    bulkUpdate.mutate(
      {
        ids: Array.from(selectedIds),
        isFavorite: !allSelectedFavorite,
      },
      { onSuccess: clearSelection },
    );
  };

  const handleBulkTagsSubmit = ({
    addTags,
    removeTags,
  }: {
    addTags: string[];
    removeTags: string[];
  }) => {
    if (selectedIds.size === 0) return;
    bulkUpdate.mutate(
      {
        ids: Array.from(selectedIds),
        addTags,
        removeTags,
      },
      {
        onSuccess: () => {
          setBulkTagOpen(false);
          clearSelection();
        },
      },
    );
  };

  const handleBulkDeleteConfirm = () => {
    if (selectedIds.size === 0) return;
    bulkDelete.mutate(Array.from(selectedIds), {
      onSuccess: () => {
        setBulkDeleteOpen(false);
        clearSelection();
      },
    });
  };

  if (authLoading) {
    return (
      <div
        id="main-content"
        role="main"
        tabIndex={-1}
        className="min-h-screen flex items-center justify-center"
      >
        <div className="text-center space-y-4">
          <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin" />
          <p className="text-muted-foreground font-medium">{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div
        id="main-content"
        role="main"
        tabIndex={-1}
        className="min-h-screen flex items-center justify-center px-4"
      >
        <div className="max-w-md space-y-4">
          <BackToHomeButton />
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("authRequiredTitle")}</AlertTitle>
            <AlertDescription>
              <p>{t("authRequiredDescription")}</p>
            </AlertDescription>
          </Alert>
          <Button asChild className="w-full">
            <Link href="/login?redirect=%2Fstrategies">{t("login")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        id="main-content"
        role="main"
        tabIndex={-1}
        className="min-h-screen flex items-center justify-center"
      >
        <div className="text-center space-y-4">
          <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin" />
          <p className="text-muted-foreground font-medium">
            {t("loadingFolders")}
          </p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div
        id="main-content"
        role="main"
        tabIndex={-1}
        className="min-h-screen flex items-center justify-center px-4"
      >
        <div className="max-w-md space-y-4">
          <BackToHomeButton />
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("loadFailedTitle")}</AlertTitle>
            <AlertDescription>
              <p>
                {t("loadFailedDescription")} {error?.message}
              </p>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div
        id="main-content"
        role="main"
        tabIndex={-1}
        className={cn(
          "mx-auto max-w-[1600px] px-4 py-6 sm:px-8 sm:py-8",
          selectionMode && selectedIds.size > 0 && "pb-32 sm:pb-8",
        )}
      >
        <Suspense fallback={<StrategiesSkeleton />}>
          <StrategiesHeader
            navigationPath={navigationPath}
            currentFolderId={currentFolderId}
            refetch={refetch}
            navigateToBreadcrumb={navigateToBreadcrumb}
            canManageFolders={canManageFolders}
            isUserLoading={isUserProfileLoading}
            hasValoMapperPremium={hasValoMapperPremium}
            hasScheduledCancellation={hasScheduledCancellation}
            subscriptionPlan={userProfile?.subscriptionPlan ?? null}
            premiumTrialDaysLeft={premiumTrialDaysLeft}
            strategyCount={strategyCount}
            freeStrategyLimit={FREE_STRATEGY_LIMIT}
            upgradeReturnToPath="/strategies"
          />

          <LibraryToolbar
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClearFilters={handleClearFilters}
            availableTags={availableTags}
            view={view}
            onViewChange={handleViewChange}
            selectionMode={selectionMode}
            onToggleSelectionMode={handleToggleSelectionMode}
            isFetching={view === "library" && library.isFetching}
            resultCount={view === "library" ? library.total : undefined}
          />

          {strategyCleanupGracePeriod && (
            <Alert className="mb-4 border-amber-200 bg-stone-50 text-stone-900 shadow-sm dark:border-amber-900/70 dark:bg-zinc-900 dark:text-zinc-100">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertTitle>{t("cleanupTitle")}</AlertTitle>
              <AlertDescription className="space-y-1 text-stone-700 dark:text-zinc-300">
                <p>
                  {t("cleanupFreePlan", {
                    date: format.dateTime(strategyCleanupGracePeriod.endsAt, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    }),
                  })}
                </p>
                <p>
                  {strategyCleanupGracePeriod.daysRemaining === 1
                    ? t("cleanupDayRemaining", {
                        limit: FREE_STRATEGY_LIMIT,
                      })
                    : t("cleanupDaysRemaining", {
                        count: strategyCleanupGracePeriod.daysRemaining,
                        limit: FREE_STRATEGY_LIMIT,
                      })}
                </p>
                {keptStrategiesPreview && (
                  <p>
                    <span className="font-medium">{t("willBeKept")}</span>{" "}
                    {keptStrategiesPreview}.
                  </p>
                )}
                {deletedStrategies.length > 0 ? (
                  <p>
                    <span className="font-medium">{t("willBeDeleted")}</span>{" "}
                    {deletedStrategiesPreview}
                    {hiddenDeletedStrategiesCount > 0
                      ? ` ${t("andMore", { count: hiddenDeletedStrategiesCount })}`
                      : ""}
                    .
                  </p>
                ) : (
                  <p>{t("nothingScheduled")}</p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {view === "library" ? (
            <LibraryView
              items={library.items}
              total={library.total}
              isLoading={library.isLoading}
              isError={library.isError}
              error={library.error}
              hasNextPage={library.hasNextPage}
              isFetchingNextPage={library.isFetchingNextPage}
              selectionMode={selectionMode}
              selectedIds={selectedIds}
              folderLabels={folderLabels}
              onToggleSelect={toggleSelect}
              onSelectAll={handleSelectAll}
              onClearSelection={clearSelection}
              onClearFilters={handleClearFilters}
              onRetry={() => void library.refetch()}
              onLoadMore={() => void library.fetchNextPage()}
              onRename={handleRename}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              onEditTags={openTagEditor}
              onToggleFavorite={handleToggleFavorite}
            />
          ) : (
            <StrategiesContent
              currentItems={currentItems}
              currentLocationId={navigationPath[navigationPath.length - 1].id}
              navigateToFolder={navigateToFolder}
              canManageFolders={canManageFolders}
              selectionMode={selectionMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onDuplicate={handleDuplicateTreeItem}
              onEditTags={handleEditTagsTreeItem}
              onToggleFavorite={handleToggleFavoriteTreeItem}
            />
          )}

          {selectionMode && selectedIds.size > 0 && (
            <BulkActionBar
              selectedCount={selectedIds.size}
              allSelectedFavorite={allSelectedFavorite}
              isPending={
                bulkUpdate.isPending || bulkDelete.isPending
              }
              onMove={() => setBulkMoveOpen(true)}
              onTags={() => setBulkTagOpen(true)}
              onToggleFavorite={handleBulkFavorite}
              onDelete={() => setBulkDeleteOpen(true)}
              onClear={clearSelection}
            />
          )}

          <Dialog open={bulkMoveOpen} onOpenChange={setBulkMoveOpen}>
            <BulkMoveDialogContent
              strategyIds={Array.from(selectedIds)}
              setOpen={setBulkMoveOpen}
              onDone={clearSelection}
            />
          </Dialog>

          <TagEditorDialog
            open={tagTarget !== null}
            onOpenChange={(open) => {
              if (!open) setTagTarget(null);
            }}
            strategyName={tagTarget?.name ?? ""}
            initialTags={tagTarget?.tags ?? []}
            availableTags={availableTags}
            isPending={updateStrategy.isPending}
            onSave={handleTagEditorSave}
          />

          <BulkTagDialog
            open={bulkTagOpen}
            onOpenChange={setBulkTagOpen}
            selectedCount={selectedIds.size}
            availableTags={availableTags}
            isPending={bulkUpdate.isPending}
            onSubmit={handleBulkTagsSubmit}
          />

          <BulkDeleteDialog
            open={bulkDeleteOpen}
            onOpenChange={setBulkDeleteOpen}
            count={selectedIds.size}
            isPending={bulkDelete.isPending}
            onConfirm={handleBulkDeleteConfirm}
          />
        </Suspense>
      </div>
    </div>
  );
};

const StrategiesSkeleton = () => {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <Skeleton className="h-6 w-full max-w-md" />
      </div>
      <div className="flex flex-wrap gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-64 rounded-lg" />
        ))}
      </div>
    </div>
  );
};

export default MyStrategiesPage;
