import { RenameDialog } from "@/components/strategies/rename-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/cn";
import { getRelativeTime } from "@/lib/format";
import { MAP_OPTIONS } from "@/lib/consts";
import { useLocalizedMapName } from "@/contexts/valorant-terms-context";
import {
  Copy,
  FolderInput,
  FolderPen,
  MoreVertical,
  Star,
  Tag,
  Trash2,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { DeleteDialog } from "./delete-dialog";
import MoveStrategyDialogContent from "./move-strategy-dialog-content";

interface StrategyItemProps {
  href: string;
  strategyId: string;
  name: string;
  selectedMapId: string;
  mapSide?: string;
  tags?: string[];
  isFavorite?: boolean;
  folderLabel?: string;
  updatedAt: Date;
  currentLocationId: string;
  onRename?: (newName: string) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onEditTags?: () => void;
  onToggleFavorite?: () => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  className?: string;
}

export const StrategyItem = ({
  href,
  strategyId,
  name,
  selectedMapId,
  mapSide,
  tags = [],
  isFavorite = false,
  folderLabel,
  updatedAt,
  currentLocationId,
  onRename,
  onDelete,
  onDuplicate,
  onEditTags,
  onToggleFavorite,
  selectable = false,
  selected = false,
  onToggleSelect,
  className,
}: StrategyItemProps) => {
  const t = useTranslations("strategies");
  const locale = useLocale();
  const [openDropdown, setOpenDropdown] = useState(false);
  const [openRenameDialog, setOpenRenameDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openMoveDialog, setOpenMoveDialog] = useState(false);

  const mapId = selectedMapId;
  const mapFallback =
    MAP_OPTIONS.find((option) => option.id === mapId)?.text ?? mapId;
  const mapName = useLocalizedMapName(mapId, mapFallback);
  const imageUrl = mapId ? `/maps/listviewicons/${mapId}.webp` : "";
  const sideLabel =
    mapSide === "attack"
      ? t("sideAttackShort")
      : mapSide === "defense" || mapSide === "defend"
        ? t("sideDefenseShort")
        : null;
  const visibleTags = tags.slice(0, 3);
  const hiddenTagCount = Math.max(0, tags.length - visibleTags.length);

  return (
    <div
      className={cn(
        "relative flex w-full max-w-56 flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 transition-all cursor-pointer group select-none sm:w-56",
        selected && "border-primary ring-2 ring-primary/70",
        className,
      )}
    >
      {selectable ? (
        <button
          type="button"
          aria-label={t("selectStrategy", { name })}
          aria-pressed={selected}
          onClick={onToggleSelect}
          className="absolute inset-0 z-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
        />
      ) : (
        <Link
          href={href}
          aria-label={t("openStrategy", { name })}
          className="absolute inset-0 z-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
        />
      )}

      <div className="pointer-events-none relative h-32 w-full bg-zinc-950">
        <Image
          src={imageUrl}
          alt={mapName || "Map preview"}
          fill
          sizes="(max-width: 640px) 100vw, 224px"
          className="object-cover opacity-90 group-hover:opacity-100 transition-opacity"
          draggable={false}
          loading="eager"
        />

        {onToggleFavorite && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onToggleFavorite();
            }}
            aria-label={isFavorite ? t("removeFavorite") : t("addFavorite")}
            aria-pressed={isFavorite}
            className="pointer-events-auto absolute top-2 left-2 z-20 h-9 w-9 rounded-full bg-black/40 text-white hover:bg-black/60 hover:text-amber-300"
          >
            <Star
              className={cn("size-4", isFavorite && "fill-amber-300 text-amber-300")}
            />
          </Button>
        )}

        {selectable && (
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggleSelect?.()}
            aria-label={t("selectStrategy", { name })}
            className="pointer-events-auto absolute top-4 left-14 z-20 size-5 border-white/60 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
          />
        )}

        <Dialog open={openRenameDialog} onOpenChange={setOpenRenameDialog}>
          <DropdownMenu open={openDropdown} onOpenChange={setOpenDropdown}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                onClick={(e) => e.stopPropagation()}
                aria-label={t("strategyActions")}
                className="pointer-events-auto absolute top-2 right-2 z-20 h-9 w-9 rounded-full bg-black/40 text-white hover:bg-black/60"
              >
                <MoreVertical size={16} />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              onCloseAutoFocus={(event) => {
                if (openRenameDialog || openDeleteDialog || openMoveDialog) {
                  event.preventDefault();
                }
              }}
            >
              <DialogTrigger asChild>
                <DropdownMenuItem
                  onClick={(e) => e.stopPropagation()}
                  onSelect={(e) => {
                    e.preventDefault();
                    setOpenRenameDialog(true);
                    setOpenDropdown(false);
                  }}
                >
                  <FolderPen />
                  {t("rename")}
                </DropdownMenuItem>
              </DialogTrigger>
              <DropdownMenuItem
                onClick={(e) => e.stopPropagation()}
                onSelect={(e) => {
                  e.preventDefault();
                  setOpenMoveDialog(true);
                  setOpenDropdown(false);
                }}
              >
                <FolderInput />
                {t("move")}
              </DropdownMenuItem>
              {onDuplicate && (
                <DropdownMenuItem
                  onClick={(e) => e.stopPropagation()}
                  onSelect={(e) => {
                    e.preventDefault();
                    setOpenDropdown(false);
                    onDuplicate();
                  }}
                >
                  <Copy />
                  {t("duplicate")}
                </DropdownMenuItem>
              )}
              {onEditTags && (
                <DropdownMenuItem
                  onClick={(e) => e.stopPropagation()}
                  onSelect={(e) => {
                    e.preventDefault();
                    setOpenDropdown(false);
                    onEditTags();
                  }}
                >
                  <Tag />
                  {t("editTags")}
                </DropdownMenuItem>
              )}
              {onToggleFavorite && (
                <DropdownMenuItem
                  onClick={(e) => e.stopPropagation()}
                  onSelect={(e) => {
                    e.preventDefault();
                    setOpenDropdown(false);
                    onToggleFavorite();
                  }}
                >
                  <Star className={cn(isFavorite && "fill-current")} />
                  {isFavorite ? t("removeFavorite") : t("addFavorite")}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={(e) => e.stopPropagation()}
                onSelect={(e) => {
                  e.preventDefault();
                  setOpenDeleteDialog(true);
                  setOpenDropdown(false);
                }}
              >
                <Trash2 className="text-destructive" />
                <span className="text-destructive">{t("delete")}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <RenameDialog
            currentName={name}
            onRename={(newName) => {
              onRename?.(newName);
              setOpenRenameDialog(false);
            }}
            type="strategy"
          />
        </Dialog>

        <Dialog open={openMoveDialog} onOpenChange={setOpenMoveDialog}>
          <MoveStrategyDialogContent
            strategyId={strategyId}
            strategyName={name}
            currentLocationId={currentLocationId}
            setOpen={setOpenMoveDialog}
          />
        </Dialog>

        <DeleteDialog
          open={openDeleteDialog}
          onOpenChange={setOpenDeleteDialog}
          onConfirm={() => {
            onDelete?.();
            setOpenDeleteDialog(false);
          }}
          itemName={name}
          type="strategy"
        />
      </div>

      <div className="pointer-events-none flex min-h-[5.5rem] flex-col gap-1 px-3 py-3">
        <div className="flex items-start gap-2">
          <p className="min-w-0 flex-1 truncate font-medium text-white">{name}</p>
          {sideLabel && (
            <Badge variant="outline" className="border-zinc-700 text-[10px] text-zinc-300">
              {sideLabel}
            </Badge>
          )}
        </div>
        <p className="truncate text-sm font-medium text-zinc-200">{mapName}</p>
        {folderLabel && (
          <p className="truncate text-[11px] text-zinc-500">{folderLabel}</p>
        )}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {visibleTags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="max-w-full truncate bg-zinc-800 text-[10px] text-zinc-200"
              >
                {tag}
              </Badge>
            ))}
            {hiddenTagCount > 0 && (
              <Badge
                variant="outline"
                className="border-zinc-700 text-[10px] text-zinc-400"
              >
                +{hiddenTagCount}
              </Badge>
            )}
          </div>
        )}
        <p className="text-xs text-zinc-400">
          {t("updated", { time: getRelativeTime(updatedAt, locale) })}
        </p>
      </div>
    </div>
  );
};
