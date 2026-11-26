"use client";

import {
  CheckSquare,
  FolderOpen,
  LayoutGrid,
  Loader2,
  Search,
  SlidersHorizontal,
  Star,
  Tag,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { TagFilterContent } from "@/components/strategies/tag-filter-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useLocalizedMapName } from "@/contexts/valorant-terms-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { MAP_OPTIONS } from "@/lib/consts";
import { cn } from "@/lib/cn";
import {
  hasActiveStrategyLibraryFilters,
  type StrategyLibraryFilters,
  type StrategySort,
  type StrategyTagMode,
} from "@/lib/strategy-library";

export type StrategyLibraryView = "folders" | "library";

interface LibraryToolbarProps {
  filters: StrategyLibraryFilters;
  onFiltersChange: (patch: Partial<StrategyLibraryFilters>) => void;
  onClearFilters: () => void;
  availableTags: string[];
  view: StrategyLibraryView;
  onViewChange: (view: StrategyLibraryView) => void;
  selectionMode: boolean;
  onToggleSelectionMode: () => void;
  isFetching?: boolean;
  resultCount?: number;
}

const MapSelectItem = ({ id, fallback }: { id: string; fallback: string }) => {
  const name = useLocalizedMapName(id, fallback);
  return <SelectItem value={id}>{name}</SelectItem>;
};

export const LibraryToolbar = ({
  filters,
  onFiltersChange,
  onClearFilters,
  availableTags,
  view,
  onViewChange,
  selectionMode,
  onToggleSelectionMode,
  isFetching = false,
  resultCount,
}: LibraryToolbarProps) => {
  const t = useTranslations("strategies");
  const isMobile = useIsMobile();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const hasActiveFilters = hasActiveStrategyLibraryFilters(filters);

  const toggleTag = (tag: string) => {
    onFiltersChange({
      tags: filters.tags.includes(tag)
        ? filters.tags.filter((value) => value !== tag)
        : [...filters.tags, tag],
    });
  };

  const sortSelect = (className?: string) => (
    <Select
      value={filters.sort}
      onValueChange={(value) => onFiltersChange({ sort: value as StrategySort })}
    >
      <SelectTrigger className={cn("h-10", className)} aria-label={t("sort")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="updated">{t("sortUpdated")}</SelectItem>
        <SelectItem value="created">{t("sortCreated")}</SelectItem>
        <SelectItem value="name">{t("sortName")}</SelectItem>
      </SelectContent>
    </Select>
  );

  const favoriteButton = (className?: string) => (
    <Button
      type="button"
      variant={filters.favoriteOnly ? "default" : "outline"}
      onClick={() => onFiltersChange({ favoriteOnly: !filters.favoriteOnly })}
      aria-pressed={filters.favoriteOnly}
      className={cn("h-10 gap-2", className)}
    >
      <Star className={cn("size-4", filters.favoriteOnly && "fill-current")} />
      {t("favoritesOnly")}
    </Button>
  );

  const mapSelect = (className?: string) => (
    <Select
      value={filters.mapId || "all"}
      onValueChange={(value) =>
        onFiltersChange({ mapId: value === "all" ? "" : value })
      }
    >
      <SelectTrigger className={cn("h-10", className)} aria-label={t("mapFilter")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{t("allMaps")}</SelectItem>
        {MAP_OPTIONS.map((option) => (
          <MapSelectItem key={option.id} id={option.id} fallback={option.text} />
        ))}
      </SelectContent>
    </Select>
  );

  const sideSelect = (className?: string) => (
    <Select
      value={filters.side || "all"}
      onValueChange={(value) =>
        onFiltersChange({
          side: value === "all" ? "" : (value as "attack" | "defense"),
        })
      }
    >
      <SelectTrigger className={cn("h-10", className)} aria-label={t("sideFilter")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{t("allSides")}</SelectItem>
        <SelectItem value="attack">{t("sideAttack")}</SelectItem>
        <SelectItem value="defense">{t("sideDefense")}</SelectItem>
      </SelectContent>
    </Select>
  );

  const tagFilter = () => (
    <TagFilterContent
      availableTags={availableTags}
      selectedTags={filters.tags}
      tagMode={filters.tagMode}
      onToggleTag={toggleTag}
      onTagModeChange={(tagMode: StrategyTagMode) =>
        onFiltersChange({ tagMode })
      }
      onClear={() => onFiltersChange({ tags: [] })}
    />
  );

  const activeFilterCount =
    (filters.favoriteOnly ? 1 : 0) +
    (filters.mapId ? 1 : 0) +
    (filters.side ? 1 : 0) +
    filters.tags.length;

  return (
    <div className="mb-6 space-y-3" data-testid="library-toolbar">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.query}
            onChange={(event) => onFiltersChange({ query: event.target.value })}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            className="h-10 pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 pb-1 md:pb-0">
          {isMobile ? (
            <Select
              value={view}
              onValueChange={(value) => {
                if (value === "folders" || value === "library") {
                  onViewChange(value);
                }
              }}
            >
              <SelectTrigger className="h-10 min-w-0 flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="folders">{t("foldersView")}</SelectItem>
                <SelectItem value="library">{t("libraryView")}</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <ToggleGroup
              type="single"
              value={view}
              onValueChange={(value) => {
                if (value === "folders" || value === "library") {
                  onViewChange(value);
                }
              }}
              className="max-w-full shrink-0 overflow-x-auto"
            >
              <ToggleGroupItem
                value="folders"
                className="min-w-fit flex-none gap-1.5 px-3 text-xs"
              >
                <FolderOpen className="size-4" />
                {t("foldersView")}
              </ToggleGroupItem>
              <ToggleGroupItem
                value="library"
                className="min-w-fit flex-none gap-1.5 px-3 text-xs"
              >
                <LayoutGrid className="size-4" />
                {t("libraryView")}
              </ToggleGroupItem>
            </ToggleGroup>
          )}

          <Button
            type="button"
            variant={selectionMode ? "default" : "outline"}
            onClick={onToggleSelectionMode}
            aria-pressed={selectionMode}
            className="h-10 shrink-0 gap-2"
          >
            <CheckSquare className="size-4" />
            <span className="hidden sm:inline">
              {selectionMode ? t("doneSelecting") : t("select")}
            </span>
          </Button>
        </div>
      </div>

      {isMobile ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setFiltersOpen(true)}
            className="h-10 gap-2"
          >
            <SlidersHorizontal className="size-4" />
            {t("filters")}
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="h-5 min-w-5 px-1.5">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              onClick={onClearFilters}
              className="h-10 gap-1"
            >
              <X className="size-4" />
              {t("clearFilters")}
            </Button>
          )}
          {view === "library" && typeof resultCount === "number" && (
            <span className="text-xs text-muted-foreground">
              {t("resultsCount", { count: resultCount })}
            </span>
          )}
          {isFetching && (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {sortSelect("min-w-36")}
          {favoriteButton()}
          {mapSelect("min-w-36")}
          {sideSelect("min-w-32")}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant={filters.tags.length > 0 ? "default" : "outline"}
                className="h-10 gap-2"
              >
                <Tag className="size-4" />
                {t("tagsFilter")}
                {filters.tags.length > 0 && (
                  <Badge variant="secondary" className="h-5 min-w-5 px-1.5">
                    {filters.tags.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80">
              {tagFilter()}
            </PopoverContent>
          </Popover>
          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              onClick={onClearFilters}
              className="h-10 gap-1"
            >
              <X className="size-4" />
              {t("clearFilters")}
            </Button>
          )}
          {view === "library" && typeof resultCount === "number" && (
            <span className="ms-auto text-xs text-muted-foreground">
              {t("resultsCount", { count: resultCount })}
            </span>
          )}
          {isFetching && (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          )}
        </div>
      )}

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader className="text-start">
            <SheetTitle>{t("filters")}</SheetTitle>
            <SheetDescription>{t("filtersDescription")}</SheetDescription>
          </SheetHeader>

          <div className="space-y-4 px-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">{t("sort")}</p>
              {sortSelect("w-full")}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">{t("favoritesOnly")}</p>
              {favoriteButton("w-full")}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">{t("mapFilter")}</p>
              {mapSelect("w-full")}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">{t("sideFilter")}</p>
              {sideSelect("w-full")}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">{t("tagsFilter")}</p>
              {tagFilter()}
            </div>
          </div>

          <SheetFooter className="flex-row gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClearFilters}
              className="flex-1"
            >
              {t("clearFilters")}
            </Button>
            <SheetClose asChild>
              <Button type="button" className="flex-1">
                {t("done")}
              </Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};
