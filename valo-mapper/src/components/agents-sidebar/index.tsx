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
  AbilityIconItem,
  Agent,
  AgentCanvas,
  AgentRole,
} from "@/lib/types";
import { useSettings } from "@/contexts/settings-context";
import { RoleTabs } from "./role-tabs";
import { SettingsPanel } from "./settings-panel";
import { AgentsGrid } from "./agents-grid";
import AgentAbilities from "./agent-abilities";
import { SIDEBAR_WIDTH, TEMP_DRAG_ID } from "@/lib/consts";
import { useCanvas } from "@/contexts/canvas-context";

interface AgentsSidebarProps {
  sidebarOpen: boolean;
}

export const AgentsSidebar = ({ sidebarOpen }: AgentsSidebarProps) => {
  const {
    agentsSettings,
    abilitiesSettings,
    updateAgentsSettings,
    updateAbilitiesSettings,
  } = useSettings();

  const {
    setAgentsOnCanvas,
    setAbilitiesOnCanvas,
    selectedCanvasIcon,
    setSelectedCanvasIcon,
    isAlly,
    setIsAlly,
    setIsDrawMode,
    setEditingTextId,
  } = useCanvas();

  const [selectedRole, setSelectedRole] = useState<"All" | AgentRole>("All");
  const [onMap, setOnMap] = useState(false);
  const [selectedAgentAbilities, setSelectedAgentAbilities] =
    useState<Agent | null>(null);

  const handleIconClick = <T extends AgentCanvas | AbilityCanvas>(
    icon: Agent | AbilityIconItem,
    setIconsOnCanvas: Dispatch<SetStateAction<T[]>>
  ) => {
    const isSameIcon = selectedCanvasIcon?.name === icon.name;

    if (isSameIcon) {
      setIconsOnCanvas((prev) =>
        prev.filter((icon) => icon.id !== TEMP_DRAG_ID)
      );
      setSelectedCanvasIcon(null);
    } else {
      setSelectedCanvasIcon(icon);

      const newCanvasIcon = {
        ...icon,
        id: TEMP_DRAG_ID,
        isAlly: isAlly,
        x: -1000,
        y: -1000,
      } as T;

      setIconsOnCanvas((prev) => {
        const withoutDrag = prev.filter((icon) => icon.id !== TEMP_DRAG_ID);
        return [...withoutDrag, newCanvasIcon];
      });
    }
  };

  const handleAgentClick = (agent: Agent | null) => {
    if (!agent) return;
    setIsDrawMode(false);
    setEditingTextId(null);
    setSelectedAgentAbilities(null);
    handleIconClick(agent, setAgentsOnCanvas);
  };

  const handleAbilityClick = (ability: AbilityIconItem | null) => {
    if (!ability) return;
    setIsDrawMode(false);
    setEditingTextId(null);
    handleIconClick(ability, setAbilitiesOnCanvas);
  };

  return (
    <SidebarProvider
      open={sidebarOpen}
      style={{
        ["--sidebar-width" as keyof React.CSSProperties]: `${SIDEBAR_WIDTH}px`,
        ["--sidebar-width-mobile" as keyof React.CSSProperties]: `${SIDEBAR_WIDTH}px`,
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
        onClose={() => setSelectedAgentAbilities(null)}
        onAbilityClick={handleAbilityClick}
      />
    </SidebarProvider>
  );
};
