"use client";

import { useState } from "react";
import Image from "next/image";
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

const ascentMap = "/maps/ascent.svg";

const agentIcons = [{ name: "Gekko", src: "/agents/gekko.png" }];

const Home = () => {
  const [mapImage] = useImage(ascentMap);
  const [agents, setAgents] = useState<
    Array<{ name: string; src: string; x: number; y: number }>
  >([]);

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
      <SidebarProvider defaultOpen>
        <Sidebar collapsible="offcanvas" side="left">
          <SidebarHeader>Tools</SidebarHeader>
          <SidebarContent>
            <span>Tools</span>
          </SidebarContent>
        </Sidebar>
        <SidebarTrigger />
      </SidebarProvider>

      <div className="flex-1 flex items-center justify-center">
        <div
          id="valo-stage"
          style={{ position: "relative" }}
          onDrop={handleStageDrop}
          onDragOver={handleStageDragOver}
        >
          <Stage width={800} height={800}>
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

      <SidebarProvider defaultOpen>
        <SidebarTrigger className="ml-auto rotate-180" />
        <Sidebar collapsible="offcanvas" side="right">
          <SidebarHeader>Other Tools</SidebarHeader>
          <SidebarContent>
            <span>Other Tools</span>
            <div className="flex flex-col items-center gap-4 mt-4">
              {agentIcons.map((agent) => (
                <Image
                  key={agent.name}
                  src={agent.src}
                  alt={agent.name}
                  width={50}
                  height={50}
                  draggable
                  style={{ cursor: "grab" }}
                  onDragStart={(e) =>
                    handleDragStart(
                      e as React.DragEvent<HTMLImageElement>,
                      agent
                    )
                  }
                />
              ))}
            </div>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>
    </div>
  );
};

export default Home;
