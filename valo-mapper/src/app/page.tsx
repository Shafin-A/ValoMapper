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
import { AbilityCanvas, AgentCanvas, IconSettings } from "@/lib/types";
import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useEffect, useRef, useState } from "react";
import { Image as KonvaImage, Layer, Stage } from "react-konva";
import useImage from "use-image";
import AbilityIcon from "@/components/ability-icon";

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

  const [agentsSettings, setAgentsSettings] = useState<IconSettings>({
    scale: 50,
    boxOpacity: 1,
    radius: 8,
    allyColor: "#18636c",
    enemyColor: "#FF4655",
  });

  const [abilitiesSettings, setAbilitiesSettings] = useState<IconSettings>({
    scale: 50,
    boxOpacity: 1,
    radius: 8,
    allyColor: "#18636c",
    enemyColor: "#FF4655",
  });

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

  const handleStageDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    const stage = stageRef.current;
    if (!stage) return;

    const rect = stage.container().getBoundingClientRect();
    const pointer = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    const scale = stage.scaleX();
    const stagePos = stage.position();

    const x = (pointer.x - stagePos.x) / scale;
    const y = (pointer.y - stagePos.y) / scale;

    const agentData = e.dataTransfer.getData("agent");
    const abilityData = e.dataTransfer.getData("ability");

    if (agentData) {
      const agent = JSON.parse(agentData);
      setAgentsOnCanvas((prev) => [...prev, { ...agent, x, y }]);
    } else if (abilityData) {
      const ability = JSON.parse(abilityData);
      setAbilitiesOnCanvas((prev) => [...prev, { ...ability, x, y }]);
    }
  };

  const handleStageDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDragEnd = <T extends { x: number; y: number }>(
    id: number,
    e: KonvaEventObject<DragEvent>,
    setState: React.Dispatch<React.SetStateAction<T[]>>
  ) => {
    const { x, y } = e.target.position();
    setState((prev) => {
      const copy = [...prev];
      copy[id] = { ...copy[id], x, y };
      return copy;
    });
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

      <div className="flex h-screen" ref={divRef}>
        <div onDrop={handleStageDrop} onDragOver={handleStageDragOver}>
          <Stage
            width={dimensions.width}
            height={dimensions.height}
            ref={stageRef}
            onWheel={handleWheel}
            draggable
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
                  onDragEnd={(e) =>
                    handleDragEnd(agent.id, e, setAgentsOnCanvas)
                  }
                  width={agentsSettings.scale}
                  height={agentsSettings.scale}
                  radius={agentsSettings.radius}
                  opacity={agentsSettings.boxOpacity}
                  allyColor={agentsSettings.allyColor}
                  enemyColor={agentsSettings.enemyColor}
                />
              ))}
            </Layer>
            <Layer>
              {abilitiesOnCanvas.map((ability) => (
                <AbilityIcon
                  key={ability.id}
                  action={ability.action}
                  isAlly={ability.isAlly}
                  x={ability.x}
                  y={ability.y}
                  src={ability.src}
                  draggable
                  onDragEnd={(e) =>
                    handleDragEnd(ability.id, e, setAbilitiesOnCanvas)
                  }
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
      </div>
      <AgentsSidebar
        sidebarOpen={rightSidebarOpen}
        agentsOnCanvas={agentsOnCanvas}
        agentsSettings={agentsSettings}
        setAgentsSettings={setAgentsSettings}
        abilitiesOnCanvas={abilitiesOnCanvas}
        abilitiesSettings={abilitiesSettings}
        setAbilitiesSettings={setAbilitiesSettings}
      />
    </div>
  );
};

export default Home;
