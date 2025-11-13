import { StrategyData } from "@/lib/types";
import {
  syncDataLoaderFeature,
  selectionFeature,
  hotkeysCoreFeature,
} from "@headless-tree/core";
import { useTree } from "@headless-tree/react";
import { Folder, FolderOpen } from "lucide-react";

interface TreeViewProps {
  flatData: Record<string, StrategyData>;
  selectedLocation: string;
  setSelectedLocation: (id: string) => void;
}

export const TreeView: React.FC<TreeViewProps> = ({
  flatData,
  selectedLocation,
  setSelectedLocation,
}) => {
  const tree = useTree<StrategyData>({
    rootItemId: "_virtual_root",
    initialState: {
      selectedItems: [selectedLocation],
    },
    setSelectedItems: (items) => {
      const newSelection =
        typeof items === "function" ? items([selectedLocation]) : items;
      const selectedId = newSelection[0] || "root";
      const selectedItem = flatData[selectedId];
      if (selectedItem?.type === "folder") {
        setSelectedLocation(selectedId);
      }
    },
    getItemName: (item) => item.getItemData().name,
    isItemFolder: (item) => item.getItemData().type === "folder",
    dataLoader: {
      getItem: (itemId) => flatData[itemId],
      getChildren: (itemId) => {
        const item = flatData[itemId];
        return item.children ? item.children.map((child) => child.id) : [];
      },
    },
    indent: 20,
    features: [syncDataLoaderFeature, selectionFeature, hotkeysCoreFeature],
  });

  return (
    <div {...tree.getContainerProps()}>
      {tree.getItems().map((item) => {
        const data = item.getItemData();
        const isFolder = data.type === "folder";

        if (!isFolder) return null;
        if (item.getId() === "_virtual_root") return null;

        return (
          <button
            key={item.getKey()}
            {...item.getProps()}
            style={{
              paddingLeft: `${item.getItemMeta().level * 20}px`,
            }}
            className={`
              w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-accent transition-colors
              ${item.isSelected() ? "bg-accent border-l-2 border-primary" : ""}
              ${item.isFocused() ? "ring-1 ring-ring" : ""}
            `}
          >
            <span className="text-base ml-2">
              {item.isExpanded() || item.getChildren().length === 0 ? (
                <FolderOpen />
              ) : (
                <Folder />
              )}
            </span>
            <span className="flex-1 font-medium">{item.getItemName()}</span>
          </button>
        );
      })}
    </div>
  );
};
