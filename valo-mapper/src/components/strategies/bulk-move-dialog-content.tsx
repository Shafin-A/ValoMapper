"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBulkUpdateStrategies } from "@/hooks/api/use-bulk-update-strategies";
import { useFolders } from "@/hooks/api/use-folder";
import {
  buildFolderFlatData,
  buildLocationPath,
  getFolderOrStrategyId,
} from "@/lib/strategy-tree";
import { FolderTreePicker } from "./folder-tree-picker";

interface BulkMoveDialogContentProps {
  strategyIds: number[];
  setOpen: (open: boolean) => void;
  onDone?: () => void;
}

export const BulkMoveDialogContent = ({
  strategyIds,
  setOpen,
  onDone,
}: BulkMoveDialogContentProps) => {
  const t = useTranslations("strategies");
  const [selectedLocation, setSelectedLocation] = useState("root");
  const { data, isLoading, isError, refetch } = useFolders();
  const { mutate: bulkUpdate, isPending } = useBulkUpdateStrategies();

  const flatData = buildFolderFlatData(data || []);
  const selectedPath = buildLocationPath(selectedLocation, flatData);
  const selectedLabel = selectedPath.map((part) => part.name).join(" > ");

  const handleMove = () => {
    const folderId = getFolderOrStrategyId(selectedLocation, "folder");
    bulkUpdate(
      {
        ids: strategyIds,
        folderId: folderId ?? null,
        hasFolderId: true,
      },
      {
        onSuccess: () => {
          setOpen(false);
          onDone?.();
        },
      },
    );
  };

  if (isError) {
    return (
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t("bulkMoveTitle")}</DialogTitle>
          <DialogDescription>
            {t("bulkMoveDescription", { count: strategyIds.length })}
          </DialogDescription>
        </DialogHeader>
        <div className="py-8 text-center">
          <p className="mb-4 text-muted-foreground">{t("loadFoldersFailed")}</p>
          <Button onClick={() => refetch()} variant="outline">
            {t("retry")}
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    );
  }

  return (
    <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle>{t("bulkMoveTitle")}</DialogTitle>
        <DialogDescription>
          {t("bulkMoveDescription", { count: strategyIds.length })}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="text-sm text-muted-foreground">
          {t("newLocation")}{" "}
          <span className="font-medium">{selectedLabel}</span>
        </div>
        <FolderTreePicker
          flatData={flatData}
          selectedLocation={selectedLocation}
          setSelectedLocation={setSelectedLocation}
          isLoading={isLoading || isPending}
        />
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => setOpen(false)}>
          {t("cancel")}
        </Button>
        <Button onClick={handleMove} disabled={isLoading || isPending}>
          {t("bulkMoveAction", { count: strategyIds.length })}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};
