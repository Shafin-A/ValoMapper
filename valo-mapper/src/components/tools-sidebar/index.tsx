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

interface ToolsSidebarProps {
  sidebarOpen: boolean;
}

export const ToolsSidebar = ({ sidebarOpen }: ToolsSidebarProps) => {
  const { setSelectedMap, undo, redo, canUndo, canRedo } = useCanvas();

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
              defaultSelectedId="ascent"
              onMapSelect={setSelectedMap}
            />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <span className="text-base font-semibold p-4">Tools</span>
          <Button onClick={undo} disabled={!canUndo}>
            Undo
          </Button>
          <Button onClick={redo} disabled={!canRedo}>
            Redo
          </Button>
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  );
};
