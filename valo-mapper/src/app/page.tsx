"use client";

import AgentsSidebar from "@/components/agents-sidebar";
import { AbilityIcon, CanvasIcon } from "@/components/canvas";
import { SiteHeader } from "@/components/site-header";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { useCanvas } from "@/contexts/canvas-context";
import { useSettings } from "@/contexts/settings-context";
import { useDimensions } from "@/hooks/use-dimensions";
import { usePositionScaling } from "@/hooks/use-position-scaling";
import { useSidebarState } from "@/hooks/use-sidebar-state";
import {
  ASCENT_MAP,
  DRAG_ID,
  MAP_SIZE,
  SCALE_FACTOR,
  SIDEBAR_WIDTH,
} from "@/lib/consts";
import { isAgent } from "@/lib/utils";
import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { Vector2d } from "konva/lib/types";
import { useCallback, useRef } from "react";
import { Image as KonvaImage, Layer, Stage } from "react-konva";
import useImage from "use-image";

const Home = () => {
  const [mapImage] = useImage(ASCENT_MAP);

  const divRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage | null>(null);

  const { dimensions, previousDimensions } = useDimensions(divRef);
  const { agentsSettings, abilitiesSettings } = useSettings();
  const sidebarState = useSidebarState();
  const canvasState = useCanvas();

  usePositionScaling(
    dimensions,
    previousDimensions,
    canvasState.agentsOnCanvas,
    canvasState.setAgentsOnCanvas,
    canvasState.abilitiesOnCanvas,
    canvasState.setAbilitiesOnCanvas,
    MAP_SIZE
  );

  const mapPosition = {
    x: (dimensions.width - MAP_SIZE) / 2,
    y: (dimensions.height - MAP_SIZE) / 2,
  };

  const handleWheel = useCallback((e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo: Vector2d = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    let direction = e.evt.deltaY > 0 ? 1 : -1;
    if (e.evt.ctrlKey) {
      direction = -direction;
    }

    const newScale =
      direction < 0 ? oldScale * SCALE_FACTOR : oldScale / SCALE_FACTOR;

    stage.scale({ x: newScale, y: newScale });

    const newPos: Vector2d = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    stage.position(newPos);
  }, []);

  const updateIconPosition = useCallback(
    (x: number, y: number) => {
      const { selectedCanvasIcon, setAgentsOnCanvas, setAbilitiesOnCanvas } =
        canvasState;

      if (!selectedCanvasIcon) return;

      if (isAgent(selectedCanvasIcon)) {
        setAgentsOnCanvas((prev) =>
          prev.map((agent) =>
            agent.id === DRAG_ID ? { ...agent, x, y } : agent
          )
        );
      } else {
        setAbilitiesOnCanvas((prev) =>
          prev.map((ability) =>
            ability.id === DRAG_ID ? { ...ability, x, y } : ability
          )
        );
      }
    },
    [canvasState]
  );

  const handleStageClick = useCallback(() => {
    const {
      selectedCanvasIcon,
      setSelectedCanvasIcon,
      setAgentsOnCanvas,
      setAbilitiesOnCanvas,
      agentsOnCanvas,
      abilitiesOnCanvas,
    } = canvasState;

    if (!selectedCanvasIcon) return;

    if (isAgent(selectedCanvasIcon)) {
      setAgentsOnCanvas((prev) => {
        const updatedAgent = prev.find((agent) => agent.id === DRAG_ID);
        if (updatedAgent) {
          updatedAgent.id = agentsOnCanvas.length;
        }
        return prev;
      });
    } else {
      setAbilitiesOnCanvas((prev) => {
        const updatedAbility = prev.find((ability) => ability.id === DRAG_ID);
        if (updatedAbility) {
          updatedAbility.id = abilitiesOnCanvas.length;
        }
        return prev;
      });
    }

    setSelectedCanvasIcon(null);
  }, [canvasState]);

  const handleStageMouseMove = useCallback(() => {
    if (!canvasState.selectedCanvasIcon) return;

    const stage = stageRef.current;
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    const stagePos = stage.position();
    const scale = stage.scaleX();

    const x = (pos.x - stagePos.x) / scale;
    const y = (pos.y - stagePos.y) / scale;

    updateIconPosition(x, y);
  }, [canvasState.selectedCanvasIcon, updateIconPosition]);

  const handleStageMouseLeave = useCallback(() => {
    const {
      selectedCanvasIcon,
      setSelectedCanvasIcon,
      setAgentsOnCanvas,
      setAbilitiesOnCanvas,
    } = canvasState;

    if (!selectedCanvasIcon) return;

    if (isAgent(selectedCanvasIcon)) {
      setAgentsOnCanvas((prev) => prev.filter((icon) => icon.id !== DRAG_ID));
    } else {
      setAbilitiesOnCanvas((prev) =>
        prev.filter((icon) => icon.id !== DRAG_ID)
      );
    }

    setSelectedCanvasIcon(null);
  }, [canvasState]);

  const renderAgents = () =>
    canvasState.agentsOnCanvas.map((agent) => (
      <CanvasIcon
        key={agent.id}
        isAlly={agent.isAlly}
        x={agent.x}
        y={agent.y}
        src={agent.src}
        draggable
        onDragEnd={() => {}}
        {...agentsSettings}
        width={agentsSettings.scale}
        height={agentsSettings.scale}
        opacity={agentsSettings.boxOpacity}
      />
    ));

  const renderAbilities = () =>
    canvasState.abilitiesOnCanvas.map((ability) => (
      <AbilityIcon
        key={ability.id}
        isAlly={ability.isAlly}
        action={ability.action}
        x={ability.x}
        y={ability.y}
        src={ability.src}
        draggable
        {...abilitiesSettings}
        width={abilitiesSettings.scale}
        height={abilitiesSettings.scale}
        opacity={abilitiesSettings.boxOpacity}
      />
    ));

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
        <Stage
          width={dimensions.width}
          height={dimensions.height}
          ref={stageRef}
          onWheel={handleWheel}
          draggable
          onMouseMove={handleStageMouseMove}
          onMouseDown={handleStageClick}
          onMouseLeave={handleStageMouseLeave}
        >
          <Layer>
            {mapImage && (
              <KonvaImage
                image={mapImage}
                width={MAP_SIZE}
                height={MAP_SIZE}
                x={mapPosition.x}
                y={mapPosition.y}
              />
            )}
          </Layer>
          <Layer>
            {renderAgents()}
            {renderAbilities()}
          </Layer>
        </Stage>
      </div>

      <AgentsSidebar sidebarOpen={sidebarState.rightSidebarOpen} />
    </div>
  );
};

export default Home;
