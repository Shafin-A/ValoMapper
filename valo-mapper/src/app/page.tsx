"use client";

import { AgentsSidebar } from "@/components/agents-sidebar";
import { MapStage } from "@/components/map-stage";
import { SiteHeader } from "@/components/site-header";
import { ToolsSidebar } from "@/components/tools-sidebar";
import { useCanvas } from "@/contexts/canvas-context";
import { useDimensions } from "@/hooks/use-dimensions";
import { usePositionScaling } from "@/hooks/use-position-scaling";
import { useSidebarState } from "@/hooks/use-sidebar-state";
import { MAP_SIZE } from "@/lib/consts";
import { useRef } from "react";

const Home = () => {
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

      <ToolsSidebar sidebarOpen={sidebarState.leftSidebarOpen} />

      <div
        className="flex h-[calc(100svh-1px-var(--header-height))]!"
        ref={divRef}
      >
        <MapStage
          width={dimensions.width}
          height={dimensions.height}
          mapPosition={mapPosition}
          mapSize={MAP_SIZE}
        />
      </div>

      <AgentsSidebar sidebarOpen={sidebarState.rightSidebarOpen} />
    </div>
  );
};

export default Home;
