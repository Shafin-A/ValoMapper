"use client";

import { useRef, useState } from "react";
import AgentsSidebar, { Agent } from "@/components/agents-sidebar";
import { Stage, Layer, Image as KonvaImage } from "react-konva";
import AgentIcon from "@/components/agent-icon";
import {
  Sidebar,
  SidebarContent,
  SidebarTrigger,
  SidebarProvider,
  SidebarHeader,
} from "@/components/ui/sidebar";
import useImage from "use-image";
import type { KonvaEventObject } from "konva/lib/Node";
import Konva from "konva";

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

const Home = () => {
  const [mapImage] = useImage(ascentMap);
  const [agents, setAgents] = useState<
    Array<{ name: string; src: string; x: number; y: number }>
  >([]);

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

    const scaleBy = 1.5;
    const newScale = direction < 0 ? oldScale * scaleBy : oldScale / scaleBy;

    stage!.scale({ x: newScale, y: newScale });

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    stage!.position(newPos);
  };

  const handleDragStart = (
    e: React.DragEvent<HTMLImageElement>,
    agent: { name: string; src: string }
  ) => {
    e.dataTransfer.setData("agent", JSON.stringify(agent));
  };

  const handleStageDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    const agent = JSON.parse(e.dataTransfer.getData("agent"));
    const stage = document.getElementById("valo-stage");

    if (!stage) return;

    const rect = stage.getBoundingClientRect();

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setAgents((prev) => [...prev, { ...agent, x, y }]);
  };

  const handleStageDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleAgentDragEnd = (idx: number, e: KonvaEventObject<DragEvent>) => {
    const { x, y } = e.target.position();
    setAgents((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], x, y };
      return copy;
    });
  };

  return (
    <div className="flex h-screen w-screen">
      <SidebarProvider
        style={{
          ["--sidebar-width" as keyof React.CSSProperties]: "20rem",
          ["--sidebar-width-mobile" as keyof React.CSSProperties]: "20rem",
        }}
      >
        <Sidebar collapsible="offcanvas" side="left">
          <SidebarHeader>Tools</SidebarHeader>
          <SidebarContent>
            <span>Tools</span>
          </SidebarContent>
        </Sidebar>

        <header className="bg-background sticky top-0 flex h-14 shrink-0 items-center gap-2">
          <div className="flex flex-1 items-center gap-2 px-3">
            <SidebarTrigger />
            <span className="font-semibold">Valorant Mapper</span>
          </div>
        </header>
      </SidebarProvider>

      <div className="flex flex-1 flex-col gap-4 p-4 items-center justify-center">
        <div
          id="valo-stage"
          style={{ position: "relative" }}
          onDrop={handleStageDrop}
          onDragOver={handleStageDragOver}
        >
          <Stage
            width={800}
            height={800}
            ref={stageRef}
            onWheel={handleWheel}
            draggable
          >
            <Layer>
              {mapImage && (
                <KonvaImage image={mapImage} width={800} height={800} />
              )}
              {agents.map((agent, idx) => (
                <AgentIcon
                  key={idx}
                  x={agent.x}
                  y={agent.y}
                  src={agent.src}
                  draggable
                  onDragEnd={(e) => handleAgentDragEnd(idx, e)}
                />
              ))}
            </Layer>
          </Stage>
        </div>
      </div>

      <AgentsSidebar
        agentIcons={agentIcons}
        handleDragStart={handleDragStart}
      />
    </div>
  );
};

export default Home;
