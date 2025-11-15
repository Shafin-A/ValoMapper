import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { useUpdateFolder } from "@/hooks/api/use-update-folder";
import { useUpdateStrategy } from "@/hooks/api/use-update-strategy";
import { StrategyData } from "@/lib/types";
import { convertFolderOrStrategyId } from "@/lib/utils";
import { FolderOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { FolderCard } from "./folder-card";
import { StrategyItem } from "./strategy-item";
import { useDeleteFolder } from "@/hooks/api/use-delete-folder";
import { useDeleteStrategy } from "@/hooks/api/use-delete-strategy";

interface StrategiesContentProps {
  currentItems: StrategyData[];
  navigateToFolder: (folderId: string, folderName: string) => void;
}

export const StrategiesContent = ({
  currentItems,
  navigateToFolder,
}: StrategiesContentProps) => {
  const router = useRouter();
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
            <EmptyTitle>This folder is empty</EmptyTitle>
            <EmptyDescription>
              Create a new strategy or folder to get started
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-wrap gap-6">
          {currentItems.map((item) =>
            item.type === "folder" ? (
              <FolderCard
                key={item.id}
                name={item.name}
                onClick={() => navigateToFolder(item.id, item.name)}
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
            ) : (
              <StrategyItem
                key={item.id}
                name={item.name}
                selectedMapId={item.selectedMapId ?? ""}
                updatedAt={
                  item.updatedAt ? new Date(item.updatedAt) : new Date()
                }
                onClick={() => router.push(`/${item.lobbyCode}`)}
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
            )
          )}
        </div>
      )}
    </>
  );
};
