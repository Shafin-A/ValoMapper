import { AbilityCanvas, Agent, AgentIconItem, IconSettings } from "@/lib/types";
import { AGENT_ICON_CONFIGS } from "@/lib/consts";
import Image from "next/image";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AgentAbilitiesProps {
  agent: Agent | null;
  sidebarOpen: boolean;
  abilitiesOnCanvas: AbilityCanvas[];
  abilitiesSettings: IconSettings;
  isAlly: boolean;
  onClose: () => void;
}

const AgentAbilities: React.FC<AgentAbilitiesProps> = ({
  agent,
  sidebarOpen,
  abilitiesOnCanvas,
  abilitiesSettings,
  isAlly,
  onClose,
}) => {
  if (!agent || !sidebarOpen) return null;

  const handleDragStart = (
    e: React.DragEvent<HTMLImageElement>,
    iconConfig: AgentIconItem,
    isAlly: boolean,
    allyColor: string,
    enemyColor: string
  ) => {
    const dragPreview = document.createElement("div");

    dragPreview.style.width = `${abilitiesSettings.scale}px`;
    dragPreview.style.height = `${abilitiesSettings.scale}px`;

    const alphaHex = Math.round(abilitiesSettings.boxOpacity * 255)
      .toString(16)
      .padStart(2, "0");

    dragPreview.style.backgroundColor = isAlly
      ? `${allyColor}${alphaHex}`
      : `${enemyColor}${alphaHex}`;

    dragPreview.style.display = "flex";
    dragPreview.style.alignItems = "center";
    dragPreview.style.justifyContent = "center";
    dragPreview.style.borderRadius = `${abilitiesSettings.radius}px`;
    dragPreview.style.position = "absolute";
    dragPreview.style.top = "-9999px";

    const clonedImg = e.currentTarget.cloneNode(true) as HTMLImageElement;
    clonedImg.style.width = `${abilitiesSettings.scale}px`;
    clonedImg.style.height = `${abilitiesSettings.scale}px`;
    clonedImg.style.borderRadius = `${abilitiesSettings.radius}px`;
    clonedImg.draggable = false;

    dragPreview.appendChild(clonedImg);

    document.body.appendChild(dragPreview);
    e.dataTransfer.setDragImage(dragPreview, 0, 0);

    setTimeout(() => {
      document.body.removeChild(dragPreview);
    }, 0);

    const abilityCanvas: AbilityCanvas = {
      id: abilitiesOnCanvas.length,
      name: iconConfig.label,
      src: iconConfig.icon,
      action: iconConfig.action,
      isAlly,
      x: 0,
      y: 0,
    };

    e.dataTransfer.setData("ability", JSON.stringify(abilityCanvas));
  };

  return (
    <div className="fixed top-[25%] right-[calc(20rem+1rem)] z-50 w-20 rounded-lg border bg-popover p-3 shadow-md">
      <Button
        variant="default"
        size="icon"
        className="absolute -top-2 -right-2 rounded-full size-6"
        onClick={onClose}
      >
        <X />
        <span className="sr-only">Close</span>
      </Button>
      <div className="flex flex-col items-center gap-6">
        {AGENT_ICON_CONFIGS[agent.name]?.map((iconConfig) => (
          <div key={iconConfig.id} title={iconConfig.label} draggable>
            <Image
              src={iconConfig.icon}
              alt={iconConfig.label}
              width={50}
              height={50}
              onDragStart={(e) =>
                handleDragStart(
                  e,
                  iconConfig,
                  isAlly,
                  abilitiesSettings.allyColor,
                  abilitiesSettings.enemyColor
                )
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default AgentAbilities;
