"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

  return (
    <div className="space-y-3">
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

      {availableTags.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noTagsYet")}</p>
      ) : (
        <ScrollArea className="max-h-64 pe-2">
          <div className="space-y-1">
            {availableTags.map((tag) => {
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
