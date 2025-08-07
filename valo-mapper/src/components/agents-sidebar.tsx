import React from "react";
import Image from "next/image";
import {
  Sidebar,
  SidebarContent,
  SidebarTrigger,
  SidebarProvider,
  SidebarHeader,
} from "@/components/ui/sidebar";

export type Agent = {
  name: string;
  src: string;
  role: "Duelist" | "Controller" | "Initiator" | "Sentinel";
};

interface AgentsSidebarProps {
  agentIcons: Agent[];
  handleDragStart: (e: React.DragEvent<HTMLImageElement>, agent: Agent) => void;
}

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

const roleTabs = [
  { value: "All", label: "All" },
  { value: "Duelist", label: "Duelist" },
  { value: "Controller", label: "Controller" },
  { value: "Initiator", label: "Initiator" },
  { value: "Sentinel", label: "Sentinel" },
];

import { Grid3x3 } from "lucide-react";

const roleIcons: Record<string, string> = {
  Controller: "/roles/controller.svg",
  Duelist: "/roles/duelist.png",
  Initiator: "/roles/initiator.png",
  Sentinel: "/roles/sentinel.png",
};

const AgentsSidebar: React.FC<AgentsSidebarProps> = ({
  agentIcons,
  handleDragStart,
}) => {
  const [selectedRole, setSelectedRole] = React.useState<string>("All");

  const filteredAgents =
    selectedRole === "All"
      ? agentIcons
      : agentIcons.filter((agent) => agent.role === selectedRole);

  return (
    <SidebarProvider defaultOpen>
      <SidebarTrigger className="ml-auto rotate-180" />
      <Sidebar collapsible="offcanvas" side="right">
        <SidebarHeader>
          <span className="text-base font-semibold">Agents</span>
        </SidebarHeader>
        <SidebarContent>
          <Tabs
            value={selectedRole}
            onValueChange={setSelectedRole}
            className="w-full"
          >
            <TabsList className="flex justify-between gap-2 mb-4">
              {roleTabs.map((tab) => {
                const isSelected = tab.value === selectedRole;
                let icon: React.ReactNode;
                if (tab.value === "All") {
                  icon = (
                    <Grid3x3
                      scale={2}
                      className="!size-6.5"
                      strokeWidth={2.5}
                      style={{ opacity: isSelected ? 1 : 0.5 }}
                    />
                  );
                } else {
                  const src = roleIcons[tab.value];
                  icon = src ? (
                    <Image
                      src={src}
                      alt={tab.value}
                      width={32}
                      height={32}
                      style={{ opacity: isSelected ? 1 : 0.5 }}
                    />
                  ) : (
                    <span className="w-8 h-8 bg-gray-300 rounded" />
                  );
                }
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="flex flex-col items-center gap-1"
                  >
                    {icon}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            <TabsContent value={selectedRole} className="h-[320px]">
              <ScrollArea className="h-full w-full">
                <div className="grid grid-cols-4 gap-4 p-2">
                  {filteredAgents.map((agent) => (
                    <Image
                      key={agent.name}
                      src={agent.src}
                      alt={agent.name}
                      width={50}
                      height={50}
                      draggable
                      style={{ cursor: "grab" }}
                      onDragStart={(e) => handleDragStart(e, agent)}
                    />
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  );
};

export default AgentsSidebar;
