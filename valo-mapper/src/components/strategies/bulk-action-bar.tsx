"use client";

import { FolderInput, Loader2, Star, Tag, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

interface BulkActionBarProps {
  selectedCount: number;
  allSelectedFavorite: boolean;
  isPending?: boolean;
  onMove: () => void;
  onTags: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
  onClear: () => void;
}

export const BulkActionBar = ({
  selectedCount,
  allSelectedFavorite,
  isPending = false,
  onMove,
  onTags,
  onToggleFavorite,
  onDelete,
  onClear,
}: BulkActionBarProps) => {
  const t = useTranslations("strategies");

  if (selectedCount === 0) {
    return null;
  }

  const actions = [
    {
      key: "move",
      icon: FolderInput,
      label: t("bulkMove"),
      onClick: onMove,
    },
    {
      key: "tags",
      icon: Tag,
      label: t("bulkTags"),
      onClick: onTags,
    },
    {
      key: "favorite",
      icon: Star,
      label: allSelectedFavorite ? t("bulkUnfavorite") : t("bulkFavorite"),
      onClick: onToggleFavorite,
    },
    {
      key: "delete",
      icon: Trash2,
      label: t("bulkDelete"),
      onClick: onDelete,
      destructive: true,
    },
  ];

  return (
    <div
      role="region"
      aria-label={t("bulkActionsAria")}
      className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-3xl flex-col gap-2 rounded-2xl border border-zinc-700 bg-zinc-900/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-white shadow-2xl backdrop-blur sm:inset-x-auto sm:bottom-6 sm:left-1/2 sm:w-auto sm:-translate-x-1/2 sm:flex-row sm:items-center sm:gap-3 sm:px-4"
    >
      <div className="flex items-center justify-between gap-2 sm:justify-start">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {t("selectedCount", { count: selectedCount })}
          </span>
          {isPending && (
            <Loader2 className="size-4 animate-spin text-zinc-400" />
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClear}
          aria-label={t("clearSelection")}
          className="h-9 w-9 text-zinc-300 hover:bg-zinc-800 hover:text-white sm:hidden"
        >
          <X />
        </Button>
      </div>

      <div className="flex items-center justify-between gap-1 sm:justify-start sm:gap-2">
        {actions.map(({ key, icon: Icon, label, onClick, destructive }) => (
          <Button
            key={key}
            type="button"
            variant="ghost"
            onClick={onClick}
            disabled={isPending}
            aria-label={label}
            className={
              destructive
                ? "h-10 flex-1 gap-1.5 px-2 text-red-300 hover:bg-red-950/40 hover:text-red-200 sm:flex-none"
                : "h-10 flex-1 gap-1.5 px-2 text-zinc-200 hover:bg-zinc-800 hover:text-white sm:flex-none"
            }
          >
            <Icon className="size-4" />
            <span className="hidden text-xs sm:inline">{label}</span>
          </Button>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClear}
          aria-label={t("clearSelection")}
          className="hidden h-9 w-9 text-zinc-300 hover:bg-zinc-800 hover:text-white sm:inline-flex"
        >
          <X />
        </Button>
      </div>
    </div>
  );
};
