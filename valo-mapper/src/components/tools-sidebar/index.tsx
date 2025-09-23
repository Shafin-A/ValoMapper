import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { MAP_OPTIONS, SIDEBAR_WIDTH } from "@/lib/consts";
import { MapSelectButton } from "./map-select-button";
import { useCanvas } from "@/contexts/canvas-context";
import { Button } from "@/components/ui/button";
import { MapOption } from "@/lib/types";
import {
  ALargeSmall,
  Eraser,
  Image as ImageIcon,
  Pencil,
  Redo,
  Trash2,
  Undo,
} from "lucide-react";

interface ToolsSidebarProps {
  sidebarOpen: boolean;
}

export const ToolsSidebar = ({ sidebarOpen }: ToolsSidebarProps) => {
  const {
    selectedMap,
    setSelectedMap,
    undo,
    redo,
    canUndo,
    canRedo,
    resetState,
  } = useCanvas();

  const handleMapSelect = (option: MapOption) => {
    setSelectedMap(option);
    resetState();
  };

  return (
    <SidebarProvider
      style={{
        ["--sidebar-width" as keyof React.CSSProperties]: SIDEBAR_WIDTH,
        ["--sidebar-width-mobile" as keyof React.CSSProperties]: SIDEBAR_WIDTH,
      }}
      open={sidebarOpen}
    >
      <Sidebar
        className="top-(--header-height) h-[calc(100svh-var(--header-height))]!"
        collapsible="offcanvas"
        side="left"
      >
        <SidebarHeader>
          <div className="flex flex-col gap-3 p-2">
            <span className="text-base font-semibold">Maps</span>
            <MapSelectButton
              mapOptions={MAP_OPTIONS}
              selectedMap={selectedMap}
              setSelectedMap={setSelectedMap}
              onMapSelect={handleMapSelect}
            />
          </div>
        </SidebarHeader>

        <SidebarContent className="px-4 pb-4">
          <div className="space-y-2">
            <span className="text-base font-semibold block">Tools</span>
            <div className="grid grid-cols-5 gap-2">
              <Button
                onClick={undo}
                disabled={!canUndo}
                variant="ghost"
                size="lg"
                className="col-start-4" // Push undo button to the right
              >
                <Undo />
              </Button>
              <Button
                onClick={redo}
                disabled={!canRedo}
                variant="ghost"
                size="lg"
              >
                <Redo />
              </Button>

              <Button variant="ghost" size="lg">
                <Pencil />
              </Button>
              <Button variant="ghost" size="lg">
                <Eraser />
              </Button>
              <Button variant="destructiveGhost" size="lg">
                <Trash2 />
              </Button>
              <Button variant="ghost" size="lg">
                <ALargeSmall />
              </Button>
              <Button variant="ghost" size="lg">
                <ImageIcon />
              </Button>
            </div>
          </div>
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  );
};
