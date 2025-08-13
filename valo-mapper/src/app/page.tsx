"use client";

import AgentIcon from "@/components/agent-icon";
import AgentsSidebar from "@/components/agents-sidebar";
import { SiteHeader } from "@/components/site-header";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { AgentCanvas, AgentsSettings } from "@/lib/types";
import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useEffect, useRef, useState } from "react";
import { Image as KonvaImage, Layer, Stage } from "react-konva";
import useImage from "use-image";

const ascentMap = "/maps/ascent.svg";

const Home = () => {
  const [mapImage] = useImage(ascentMap);
  const [agentsOnCanvas, setAgentsOnCanvas] = useState<AgentCanvas[]>([]);

  const divRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0,
  });

  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);

  const [agentsSettings, setAgentsSettings] = useState<AgentsSettings>({
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

    const agent = JSON.parse(e.dataTransfer.getData("agent"));
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

    setAgentsOnCanvas((prev) => [...prev, { ...agent, x, y }]);
  };

  const handleStageDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleAgentDragEnd = (idx: number, e: KonvaEventObject<DragEvent>) => {
    const { x, y } = e.target.position();
    setAgentsOnCanvas((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], x, y };
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
              {agentsOnCanvas.map((agent, idx) => (
                <AgentIcon
                  key={idx}
                  isAlly={agent.isAlly}
                  x={agent.x}
                  y={agent.y}
                  src={agent.src}
                  draggable
                  onDragEnd={(e) => handleAgentDragEnd(idx, e)}
                  width={agentsSettings.scale}
                  height={agentsSettings.scale}
                  radius={agentsSettings.radius}
                  opacity={agentsSettings.boxOpacity}
                  allyColor={agentsSettings.allyColor}
                  enemyColor={agentsSettings.enemyColor}
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
      />
    </div>
  );
};

export default Home;
