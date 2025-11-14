import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { StrategyData } from "@/lib/types";
import { FolderOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { FolderCard } from "./folder-card";
import { StrategyItem } from "./strategy-item";

interface StrategiesContentProps {
  currentItems: StrategyData[];
  navigateToFolder: (folderId: string, folderName: string) => void;
}

export const StrategiesContent = ({
  currentItems,
  navigateToFolder,
}: StrategiesContentProps) => {
  const router = useRouter();

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
                onRename={() => console.log("Rename folder:", item.id)}
                onDelete={() => console.log("Delete folder:", item.id)}
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
                onRename={() => console.log("Rename strategy:", item.id)}
                onDelete={() => console.log("Delete strategy:", item.id)}
              />
            )
          )}
        </div>
      )}
    </>
  );
};
