import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Dispatch, SetStateAction, useState } from "react";
import { AbilityCanvas, Agent, AgentCanvas, AgentRole } from "@/lib/types";
import { useSettings } from "@/contexts/settings-context";
import { RoleTabs } from "./role-tabs";
import { SettingsPanel } from "./settings-panel";
import { AgentsGrid } from "./agents-grid";
import AgentAbilities from "./agent-abilities";

interface AgentsSidebarProps {
  sidebarOpen: boolean;
  agentsOnCanvas: AgentCanvas[];
  setAgentsOnCanvas: Dispatch<SetStateAction<AgentCanvas[]>>;
  abilitiesOnCanvas: AbilityCanvas[];
  stageScale: number;
  selectedAgent: Agent | null;
  setSelectedAgent: Dispatch<SetStateAction<Agent | null>>;
  isAlly: boolean;
  setIsAlly: Dispatch<SetStateAction<boolean>>;
}

const AgentsSidebar: React.FC<AgentsSidebarProps> = ({
  sidebarOpen,
  agentsOnCanvas,
  setAgentsOnCanvas,
  abilitiesOnCanvas,
  stageScale,
  selectedAgent,
  setSelectedAgent,
  isAlly,
  setIsAlly,
}) => {
  const {
    agentsSettings,
    abilitiesSettings,
    updateAgentsSettings,
    updateAbilitiesSettings,
  } = useSettings();

  const [selectedRole, setSelectedRole] = useState<"All" | AgentRole>("All");
  const [onMap, setOnMap] = useState(false);
  const [selectedAgentAbilities, setSelectedAgentAbilities] =
    useState<Agent | null>(null);

  const handleAgentClick = (agent: Agent | null) => {
    if (!agent) return;

    setSelectedAgentAbilities(null);

    const isSameAgent = selectedAgent?.name === agent.name;

    if (isSameAgent) {
      setAgentsOnCanvas((prev) => {
        const withoutDrag = prev.filter((icon) => icon.id !== -1);
        return withoutDrag;
      });
      setSelectedAgent(null);
    } else {
      setSelectedAgent(agent);

      const newAgentCanvas: AgentCanvas = {
        ...agent,
        id: -1,
        isAlly: isAlly,
        x: 0,
        y: 0,
      };

      setAgentsOnCanvas((prev) => {
        const withoutDrag = prev.filter((icon) => icon.id !== -1);
        return [...withoutDrag, newAgentCanvas];
      });
    }
  };

  return (
    <SidebarProvider
      open={sidebarOpen}
      style={{
        ["--sidebar-width" as keyof React.CSSProperties]: "20rem",
        ["--sidebar-width-mobile" as keyof React.CSSProperties]: "20rem",
      }}
    >
      <Sidebar
        className="top-(--header-height) h-[calc(100svh-var(--header-height))]!"
        collapsible="offcanvas"
        side="right"
      >
        <SidebarHeader>
          <div className="flex flex-col gap-3 p-2">
            <span className="text-base font-semibold">Agents</span>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  style={{
                    backgroundColor: isAlly
                      ? agentsSettings.allyColor
                      : agentsSettings.enemyColor,
                  }}
                  checked={isAlly}
                  onCheckedChange={setIsAlly}
                />
                <span className="text-sm">{isAlly ? "Ally" : "Enemy"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={onMap}
                  onCheckedChange={(checked) => setOnMap(!!checked)}
                />
                <span className="text-sm">On map</span>
              </div>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <Tabs
            value={selectedRole}
            onValueChange={(value) =>
              setSelectedRole(value as AgentRole | "All")
            }
            className="w-full"
          >
            <RoleTabs selectedRole={selectedRole} />
            <TabsContent value={selectedRole} className="h-[320px]">
              <AgentsGrid
                selectedRole={selectedRole}
                onMap={onMap}
                agentsOnCanvas={agentsOnCanvas}
                isAlly={isAlly}
                selectedAgent={selectedAgent}
                setSelectedAgent={setSelectedAgent}
                onAgentClick={handleAgentClick}
                selectedAgentAbilities={selectedAgentAbilities}
                setSelectedAgentAbilities={setSelectedAgentAbilities}
              />
            </TabsContent>
          </Tabs>
          <Separator />
          <Accordion type="multiple" className="w-full">
            <AccordionItem value="agents-settings">
              <AccordionTrigger className="px-2">
                Agents Settings
              </AccordionTrigger>
              <AccordionContent>
                <SettingsPanel
                  settings={agentsSettings}
                  onSettingsChange={updateAgentsSettings}
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="abilities-settings">
              <AccordionTrigger className="px-2">
                Abilities Settings
              </AccordionTrigger>
              <AccordionContent>
                <SettingsPanel
                  settings={abilitiesSettings}
                  onSettingsChange={updateAbilitiesSettings}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </SidebarContent>
      </Sidebar>
      <AgentAbilities
        agent={selectedAgentAbilities}
        sidebarOpen={sidebarOpen}
        abilitiesOnCanvas={abilitiesOnCanvas}
        isAlly={isAlly}
        stageScale={stageScale}
        onClose={() => setSelectedAgentAbilities(null)}
      />
    </SidebarProvider>
  );
};

export default AgentsSidebar;
