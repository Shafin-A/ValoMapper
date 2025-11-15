import { RenameDialog } from "@/components/strategies/rename-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, getRelativeTime } from "@/lib/utils";
import { FolderPen, MoreVertical, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { DeleteDialog } from "./delete-dialog";

interface StrategyItemProps {
  name: string;
  selectedMapId: string;
  updatedAt: Date;
  onClick?: () => void;
  onRename?: (newName: string) => void;
  onDelete?: () => void;
  className?: string;
}

export const StrategyItem = ({
  name,
  selectedMapId,
  updatedAt,
  onClick,
  onRename,
  onDelete,
  className,
}: StrategyItemProps) => {
  const [openDropdown, setOpenDropdown] = useState(false);
  const [openRenameDialog, setOpenRenameDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  const mapId = selectedMapId;
  const imageUrl = mapId ? `/maps/listviewicons/${mapId}.webp` : "";

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        if (!openRenameDialog && !openDeleteDialog) onClick?.();
      }}
      className={cn(
        "relative flex flex-col w-56 rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900 transition-all cursor-pointer group select-none",
        className
      )}
    >
      <div className="relative h-32 w-full bg-zinc-950">
        <Image
          src={imageUrl}
          alt={mapId ?? "Map preview"}
          fill
          sizes="100%"
          className="object-cover opacity-90 group-hover:opacity-100 transition-opacity"
          draggable={false}
        />

        <Dialog open={openRenameDialog} onOpenChange={setOpenRenameDialog}>
          <DropdownMenu open={openDropdown} onOpenChange={setOpenDropdown}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                onClick={(e) => e.stopPropagation()}
                className="absolute top-2 right-2 rounded-full"
              >
                <MoreVertical size={16} />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              onCloseAutoFocus={(event) => {
                if (openRenameDialog || openDeleteDialog) {
                  event.preventDefault(); // Prevent dropdown from stealing focus when dialog is opening
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
                  Rename
                </DropdownMenuItem>
              </DialogTrigger>
              <DropdownMenuItem
                onClick={(e) => e.stopPropagation()}
                onSelect={(e) => {
                  e.preventDefault();
                  setOpenDeleteDialog(true);
                  setOpenDropdown(false);
                }}
              >
                <Trash2 className="text-destructive" />
                <span className="text-destructive">Delete</span>
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

      <div className="flex flex-col gap-1 px-3 py-3">
        <p className="text-white font-medium truncate">{name}</p>
        <p className="text-white font-medium truncate capitalize">{mapId}</p>
        <p className="text-xs text-zinc-400">
          Updated {getRelativeTime(updatedAt)}
        </p>
      </div>
    </div>
  );
};
