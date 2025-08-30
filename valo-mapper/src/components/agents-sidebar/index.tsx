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
import {
  AbilityCanvas,
  Agent,
  AgentCanvas,
  AgentRole,
  IconSettings,
} from "@/lib/types";
import { RoleTabs } from "./role-tabs";
import { SettingsPanel } from "./settings-panel";
import { AgentsGrid } from "./agents-grid";
import AgentAbilities from "../agent-abilities";

interface AgentsSidebarProps {
  sidebarOpen: boolean;
  agentsOnCanvas: AgentCanvas[];
  agentsSettings: IconSettings;
  setAgentsSettings: Dispatch<SetStateAction<IconSettings>>;
  abilitiesOnCanvas: AbilityCanvas[];
  abilitiesSettings: IconSettings;
  setAbilitiesSettings: Dispatch<SetStateAction<IconSettings>>;
}

const AgentsSidebar: React.FC<AgentsSidebarProps> = ({
  sidebarOpen,
  agentsOnCanvas,
  agentsSettings,
  setAgentsSettings,
  abilitiesOnCanvas,
  abilitiesSettings,
  setAbilitiesSettings,
}) => {
  const [selectedRole, setSelectedRole] = useState<"All" | AgentRole>("All");
  const [isAlly, setIsAlly] = useState(true);
  const [onMap, setOnMap] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

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
                agentsSettings={agentsSettings}
                isAlly={isAlly}
                onAgentClick={(agent) =>
                  setSelectedAgent(
                    selectedAgent?.name === agent?.name ? null : agent
                  )
                }
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
                  onSettingsChange={setAgentsSettings}
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
                  onSettingsChange={setAbilitiesSettings}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </SidebarContent>
      </Sidebar>
      <AgentAbilities
        agent={selectedAgent}
        sidebarOpen={sidebarOpen}
        abilitiesOnCanvas={abilitiesOnCanvas}
        abilitiesSettings={abilitiesSettings}
        isAlly={isAlly}
        onClose={() => setSelectedAgent(null)}
      />
    </SidebarProvider>
  );
};

export default AgentsSidebar;
