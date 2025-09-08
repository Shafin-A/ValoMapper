"use client";

import DraggableIcon from "@/components/draggable-icon";
import AgentsSidebar from "@/components/agents-sidebar";
import { SiteHeader } from "@/components/site-header";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
} from "@/components/ui/sidebar";
import {
  AbilityCanvas,
  AbilityIconItem,
  Agent,
  AgentCanvas,
} from "@/lib/types";
import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useEffect, useRef, useState } from "react";
import { Image as KonvaImage, Layer, Stage } from "react-konva";
import useImage from "use-image";
import AbilityIcon from "@/components/ability-icon";
import { useSettings } from "@/contexts/settings-context";
import { isAgent } from "@/lib/utils";
import { DRAG_ID } from "@/lib/consts";

const ascentMap = "/maps/ascent.svg";

const Home = () => {
  const [mapImage] = useImage(ascentMap);
  const [agentsOnCanvas, setAgentsOnCanvas] = useState<AgentCanvas[]>([]);
  const [abilitiesOnCanvas, setAbilitiesOnCanvas] = useState<AbilityCanvas[]>(
    []
  );

  const divRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0,
  });

  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);

  const { agentsSettings, abilitiesSettings } = useSettings();

  const [selectedCanvasIcon, setSelectedCanvasIcon] = useState<
    Agent | AbilityIconItem | null
  >(null);

  const [isAlly, setIsAlly] = useState(true);

  useEffect(() => {
    if (divRef.current?.offsetHeight && divRef.current?.offsetWidth) {
      setDimensions({
        width: divRef.current.offsetWidth,
        height: divRef.current.offsetHeight,
      });
    }
  }, []);

  const stageRef = useRef<Konva.Stage | null>(null);

  // wheel example from konva docs
  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    const stage = stageRef.current;
    const oldScale = stage!.scaleX();
    const pointer = stage!.getPointerPosition()!;

    const mousePointTo = {
      x: (pointer.x - stage!.x()) / oldScale,
      y: (pointer.y - stage!.y()) / oldScale,
    };

    // how to scale? Zoom in? Or zoom out?
    let direction = e.evt.deltaY > 0 ? 1 : -1;

    // when we zoom on trackpad, e.evt.ctrlKey is true
    // in that case lets revert direction
    if (e.evt.ctrlKey) {
      direction = -direction;
    }

    const scaleBy = 1.25;
    const newScale = direction < 0 ? oldScale * scaleBy : oldScale / scaleBy;

    stage!.scale({ x: newScale, y: newScale });

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    stage!.position(newPos);
  };

  const handleStageClick = () => {
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
  };

  const handleStageMouseMove = () => {
    if (!selectedCanvasIcon) return;

    const stage = stageRef.current;
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    const stagePos = stage.position();

    const scale = stage.scaleX();
    const x = (pos.x - stagePos.x) / scale;
    const y = (pos.y - stagePos.y) / scale;

    if (isAgent(selectedCanvasIcon)) {
      setAgentsOnCanvas((prev) => {
        return prev.map((agent) =>
          agent.id === DRAG_ID ? { ...agent, x, y } : agent
        );
      });
    } else {
      setAbilitiesOnCanvas((prev) => {
        return prev.map((ability) =>
          ability.id === DRAG_ID ? { ...ability, x, y } : ability
        );
      });
    }
  };

  const handleStageMouseLeave = () => {
    if (!selectedCanvasIcon) return;

    if (isAgent(selectedCanvasIcon)) {
      setAgentsOnCanvas((prev) => {
        const withoutDrag = prev.filter((icon) => icon.id !== DRAG_ID);
        return withoutDrag;
      });
    } else {
      setAbilitiesOnCanvas((prev) => {
        const withoutDrag = prev.filter((icon) => icon.id !== DRAG_ID);
        return withoutDrag;
      });
    }

    setSelectedCanvasIcon(null);
  };

  return (
    <div className="[--header-height:calc(--spacing(14))]">
      <SiteHeader
        leftSidebarOpen={leftSidebarOpen}
        setLeftSidebarOpen={setLeftSidebarOpen}
        rightSidebarOpen={rightSidebarOpen}
        setRightSidebarOpen={setRightSidebarOpen}
      />

      <SidebarProvider
        style={{
          ["--sidebar-width" as keyof React.CSSProperties]: "20rem",
          ["--sidebar-width-mobile" as keyof React.CSSProperties]: "20rem",
        }}
        open={leftSidebarOpen}
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
                width={1000}
                height={1000}
                x={(dimensions.width - 1000) / 2}
                y={(dimensions.height - 1000) / 2}
              />
            )}
          </Layer>
          <Layer>
            {agentsOnCanvas.map((agent) => (
              <DraggableIcon
                key={agent.id}
                isAlly={agent.isAlly}
                x={agent.x}
                y={agent.y}
                src={agent.src}
                draggable
                onDragEnd={() => {}}
                width={agentsSettings.scale}
                height={agentsSettings.scale}
                radius={agentsSettings.radius}
                opacity={agentsSettings.boxOpacity}
                allyColor={agentsSettings.allyColor}
                enemyColor={agentsSettings.enemyColor}
              />
            ))}

            {abilitiesOnCanvas.map((ability) => (
              <AbilityIcon
                key={ability.id}
                action={ability.action}
                isAlly={ability.isAlly}
                x={ability.x}
                y={ability.y}
                src={ability.src}
                draggable
                width={abilitiesSettings.scale}
                height={abilitiesSettings.scale}
                radius={abilitiesSettings.radius}
                opacity={abilitiesSettings.boxOpacity}
                allyColor={abilitiesSettings.allyColor}
                enemyColor={abilitiesSettings.enemyColor}
              />
            ))}
          </Layer>
        </Stage>
      </div>
      <AgentsSidebar
        sidebarOpen={rightSidebarOpen}
        agentsOnCanvas={agentsOnCanvas}
        setAgentsOnCanvas={setAgentsOnCanvas}
        selectedCanvasIcon={selectedCanvasIcon}
        setSelectedCanvasIcon={setSelectedCanvasIcon}
        setAbilitiesOnCanvas={setAbilitiesOnCanvas}
        isAlly={isAlly}
        setIsAlly={setIsAlly}
      />
    </div>
  );
};

export default Home;
