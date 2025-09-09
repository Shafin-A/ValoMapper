"use client";

import AgentsSidebar from "@/components/agents-sidebar";
import { MapStage } from "@/components/map-stage";
import { SiteHeader } from "@/components/site-header";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { useCanvas } from "@/contexts/canvas-context";
import { useDimensions } from "@/hooks/use-dimensions";
import { usePositionScaling } from "@/hooks/use-position-scaling";
import { useSidebarState } from "@/hooks/use-sidebar-state";
import { ASCENT_MAP, MAP_SIZE, SIDEBAR_WIDTH } from "@/lib/consts";
import { useRef } from "react";
import useImage from "use-image";

const Home = () => {
  const [mapImage] = useImage(ASCENT_MAP);

  const divRef = useRef<HTMLDivElement>(null);

  const { dimensions, previousDimensions } = useDimensions(divRef);
  const sidebarState = useSidebarState();
  const {
    agentsOnCanvas,
    setAgentsOnCanvas,
    abilitiesOnCanvas,
    setAbilitiesOnCanvas,
  } = useCanvas();

  usePositionScaling(
    dimensions,
    previousDimensions,
    agentsOnCanvas,
    setAgentsOnCanvas,
    abilitiesOnCanvas,
    setAbilitiesOnCanvas,
    MAP_SIZE
  );

  const mapPosition = {
    x: (dimensions.width - MAP_SIZE) / 2,
    y: (dimensions.height - MAP_SIZE) / 2,
  };

  return (
    <div className="[--header-height:calc(--spacing(14))]">
      <SiteHeader {...sidebarState} />

      <SidebarProvider
        style={{
          ["--sidebar-width" as keyof React.CSSProperties]: SIDEBAR_WIDTH,
          ["--sidebar-width-mobile" as keyof React.CSSProperties]:
            SIDEBAR_WIDTH,
        }}
        open={sidebarState.leftSidebarOpen}
      >
        <Sidebar
          className="top-(--header-height) h-[calc(100svh-var(--header-height))]!"
          collapsible="offcanvas"
          side="left"
        >
          <SidebarHeader>Tools</SidebarHeader>
          <SidebarContent>
            <span>Tools</span>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>

      <div
        className="flex h-[calc(100svh-1px-var(--header-height))]!"
        ref={divRef}
      >
        <MapStage
          width={dimensions.width}
          height={dimensions.height}
          mapImage={mapImage}
          mapPosition={mapPosition}
          mapSize={MAP_SIZE}
        />
      </div>

      <AgentsSidebar sidebarOpen={sidebarState.rightSidebarOpen} />
    </div>
  );
};

export default Home;
