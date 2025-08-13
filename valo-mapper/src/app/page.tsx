"use client";

import { useEffect, useRef, useState } from "react";
import AgentsSidebar, { Agent } from "@/components/agents-sidebar";
import { Stage, Layer, Image as KonvaImage } from "react-konva";
import AgentIcon from "@/components/agent-icon";
import {
  Sidebar,
  SidebarContent,
  SidebarProvider,
  SidebarHeader,
} from "@/components/ui/sidebar";
import useImage from "use-image";
import type { KonvaEventObject } from "konva/lib/Node";
import Konva from "konva";
import { SiteHeader } from "@/components/site-header";

const ascentMap = "/maps/ascent.svg";

const agentIcons: Agent[] = [
  { name: "Astra", src: "/agents/astra.png", role: "Controller" },
  { name: "Breach", src: "/agents/breach.png", role: "Initiator" },
  { name: "Brimstone", src: "/agents/brimstone.png", role: "Controller" },
  { name: "Chamber", src: "/agents/chamber.png", role: "Sentinel" },
  { name: "Clove", src: "/agents/clove.png", role: "Controller" },
  { name: "Cypher", src: "/agents/cypher.png", role: "Sentinel" },
  { name: "Deadlock", src: "/agents/deadlock.png", role: "Sentinel" },
  { name: "Fade", src: "/agents/fade.png", role: "Initiator" },
  { name: "Gekko", src: "/agents/gekko.png", role: "Initiator" },
  { name: "Harbor", src: "/agents/harbor.png", role: "Controller" },
  { name: "Iso", src: "/agents/iso.png", role: "Duelist" },
  { name: "Jett", src: "/agents/jett.png", role: "Duelist" },
  { name: "KAY/O", src: "/agents/kayo.png", role: "Initiator" },
  { name: "Killjoy", src: "/agents/killjoy.png", role: "Sentinel" },
  { name: "Neon", src: "/agents/neon.png", role: "Duelist" },
  { name: "Omen", src: "/agents/omen.png", role: "Controller" },
  { name: "Phoenix", src: "/agents/phoenix.png", role: "Duelist" },
  { name: "Raze", src: "/agents/raze.png", role: "Duelist" },
  { name: "Reyna", src: "/agents/reyna.png", role: "Duelist" },
  { name: "Sage", src: "/agents/sage.png", role: "Sentinel" },
  { name: "Skye", src: "/agents/skye.png", role: "Initiator" },
  { name: "Sova", src: "/agents/sova.png", role: "Initiator" },
  { name: "Tejo", src: "/agents/tejo.png", role: "Initiator" },
  { name: "Viper", src: "/agents/viper.png", role: "Controller" },
  { name: "Vyse", src: "/agents/vyse.png", role: "Sentinel" },
  { name: "Waylay", src: "/agents/waylay.png", role: "Duelist" },
  { name: "Yoru", src: "/agents/yoru.png", role: "Duelist" },
];

export type AgentCanvas = {
  name: string;
  src: string;
  role: "Duelist" | "Controller" | "Initiator" | "Sentinel";
  isAlly: boolean;
  x: number;
  y: number;
};

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

  const [agentsScale, setAgentsScale] = useState(50);
  const [agentsBoxOpacity, setAgentsBoxOpacity] = useState(1);

  const [agentsRadius, setAgentsRadius] = useState(8);

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
                  width={agentsScale}
                  height={agentsScale}
                  radius={agentsRadius}
                  opacity={agentsBoxOpacity}
                />
              ))}
            </Layer>
          </Stage>
        </div>
      </div>
      <AgentsSidebar
        agentIcons={agentIcons}
        sidebarOpen={rightSidebarOpen}
        agentsOnCanvas={agentsOnCanvas}
        agentsScale={agentsScale}
        setAgentsScale={setAgentsScale}
        agentsBoxOpacity={agentsBoxOpacity}
        setAgentsBoxOpacity={setAgentsBoxOpacity}
        agentsRadius={agentsRadius}
        setAgentsRadius={setAgentsRadius}
      />
    </div>
  );
};

export default Home;
