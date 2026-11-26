"use client";

import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { StrategyTagMode } from "@/lib/strategy-library";

interface TagFilterContentProps {
  availableTags: string[];
  selectedTags: string[];
  tagMode: StrategyTagMode;
  onToggleTag: (tag: string) => void;
  onTagModeChange: (mode: StrategyTagMode) => void;
  onClear: () => void;
}

export const TagFilterContent = ({
  availableTags,
  selectedTags,
  tagMode,
  onToggleTag,
  onTagModeChange,
  onClear,
}: TagFilterContentProps) => {
  const t = useTranslations("strategies");
  const [query, setQuery] = useState("");

  const visibleTags = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return availableTags;
    }
    return availableTags.filter((tag) =>
      tag.toLowerCase().includes(normalizedQuery),
    );
  }, [availableTags, query]);

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{t("tagsFilter")}</p>
        {selectedTags.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-7 px-2 text-xs"
          >
            {t("clearTags")}
          </Button>
        )}
      </div>

      <ToggleGroup
        type="single"
        value={tagMode}
        onValueChange={(value) => {
          if (value === "all" || value === "any") {
            onTagModeChange(value);
          }
        }}
        className="w-full"
      >
        <ToggleGroupItem value="all" className="flex-1 text-xs">
          {t("matchAllTags")}
        </ToggleGroupItem>
        <ToggleGroupItem value="any" className="flex-1 text-xs">
          {t("matchAnyTags")}
        </ToggleGroupItem>
      </ToggleGroup>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("tagSearchPlaceholder")}
          aria-label={t("tagSearchPlaceholder")}
          className="h-9 pr-8 pl-8 text-sm"
        />
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setQuery("")}
            aria-label={t("clearTagSearch")}
            className="absolute top-1/2 right-1 size-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </Button>
        )}
      </div>

      {availableTags.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noTagsYet")}</p>
      ) : visibleTags.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noMatchingTags")}</p>
      ) : (
        <ScrollArea className="h-56 min-h-0 pe-2" type="auto">
          <div className="space-y-1">
            {visibleTags.map((tag) => {
              const checked = selectedTags.includes(tag);
              return (
                <label
                  key={tag}
                  className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-1.5 text-sm hover:bg-accent"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => onToggleTag(tag)}
                    aria-label={tag}
                  />
                  <span className="min-w-0 truncate">{tag}</span>
                </label>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};
