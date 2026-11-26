import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { useDeleteFolder } from "@/hooks/api/use-delete-folder";
import { useDeleteStrategy } from "@/hooks/api/use-delete-strategy";
import { useUpdateFolder } from "@/hooks/api/use-update-folder";
import { useUpdateStrategy } from "@/hooks/api/use-update-strategy";
import { StrategyData } from "@/lib/types";
import { convertFolderOrStrategyId } from "@/lib/strategy-tree";
import { FolderOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { FolderCard } from "./folder-card";
import { StrategyItem } from "./strategy-item";

interface StrategiesContentProps {
  currentItems: StrategyData[];
  currentLocationId: string;
  navigateToFolder: (folderId: string, folderName: string) => void;
  canManageFolders: boolean;
  selectionMode?: boolean;
  selectedIds?: Set<number>;
  onToggleSelect?: (strategyId: number) => void;
  onDuplicate?: (item: StrategyData) => void;
  onEditTags?: (item: StrategyData) => void;
  onToggleFavorite?: (item: StrategyData) => void;
}

export const StrategiesContent = ({
  currentItems,
  currentLocationId,
  navigateToFolder,
  canManageFolders,
  selectionMode = false,
  selectedIds,
  onToggleSelect,
  onDuplicate,
  onEditTags,
  onToggleFavorite,
}: StrategiesContentProps) => {
  const t = useTranslations("strategies");
  const { mutate: updateFolder } = useUpdateFolder();
  const { mutate: updateStrategy } = useUpdateStrategy();

  const { mutate: deleteFolder } = useDeleteFolder();
  const { mutate: deleteStrategy } = useDeleteStrategy();

  return (
    <>
      {currentItems.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderOpen />
            </EmptyMedia>
            <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
            <EmptyDescription>{t("emptyDescription")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-wrap justify-center gap-4 sm:justify-start sm:gap-6">
          {currentItems.map((item) => {
            if (item.type === "folder") {
              return (
                <FolderCard
                  key={item.id}
                  name={item.name}
                  onClick={() => navigateToFolder(item.id, item.name)}
                  actionsDisabled={!canManageFolders}
                  actionsDisabledTooltip={t("folderActionsDisabled")}
                  onRename={(newName) =>
                    updateFolder({
                      folderId: convertFolderOrStrategyId(item.id, "folder"),
                      name: newName,
                    })
                  }
                  onDelete={() =>
                    deleteFolder({
                      folderId: convertFolderOrStrategyId(item.id, "folder"),
                    })
                  }
                />
              );
            }

            const strategyId =
              item.strategyId ?? convertFolderOrStrategyId(item.id, "strategy");

            return (
              <StrategyItem
                key={item.id}
                href={`/${item.lobbyCode}`}
                strategyId={item.id}
                name={item.name}
                selectedMapId={item.selectedMapId ?? ""}
                mapSide={item.mapSide}
                tags={item.tags ?? []}
                isFavorite={item.isFavorite ?? false}
                updatedAt={
                  item.updatedAt ? new Date(item.updatedAt) : new Date()
                }
                currentLocationId={currentLocationId}
                selectable={selectionMode}
                selected={selectedIds?.has(strategyId) ?? false}
                onToggleSelect={() => onToggleSelect?.(strategyId)}
                onDuplicate={
                  onDuplicate ? () => onDuplicate(item) : undefined
                }
                onEditTags={onEditTags ? () => onEditTags(item) : undefined}
                onToggleFavorite={
                  onToggleFavorite ? () => onToggleFavorite(item) : undefined
                }
                onRename={(newName) =>
                  updateStrategy({
                    strategyId: convertFolderOrStrategyId(item.id, "strategy"),
                    name: newName,
                  })
                }
                onDelete={() =>
                  deleteStrategy({
                    strategyId: convertFolderOrStrategyId(item.id, "strategy"),
                  })
                }
              />
            );
          })}
        </div>
      )}
    </>
  );
};
