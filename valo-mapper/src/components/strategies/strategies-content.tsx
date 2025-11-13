import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { StrategyData } from "@/lib/types";
import { FolderOpen } from "lucide-react";
import { FolderCard } from "./folder-card";
import { StrategyItem } from "./strategy-item";
import { useRouter } from "next/navigation";

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
                onMenuClick={() => console.log("Folder menu:", item.id)}
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
                onMenuClick={() => console.log("Strategy menu:", item.id)}
              />
            )
          )}
        </div>
      )}
    </>
  );
};
