import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCanvas } from "@/contexts/canvas-context";
import { useCollaborativeCanvas } from "@/hooks/use-collaborative-canvas";
import {
  ALargeSmall,
  MapPinned,
  Image as ImageIcon,
  Pencil,
  Swords,
  Users,
} from "lucide-react";

export const DeleteSettings = () => {
  const {
    resetState,
    agentsOnCanvas,
    setAgentsOnCanvas,
    abilitiesOnCanvas,
    setAbilitiesOnCanvas,
    drawLines,
    setDrawLines,
    textsOnCanvas,
    setTextsOnCanvas,
    imagesOnCanvas,
    setImagesOnCanvas,
    toolIconsOnCanvas,
    setToolIconsOnCanvas,
    connectingLines,
    setConnectingLines,
  } = useCanvas();

  const {
    notifyCanvasClear,
    notifyAgentRemoved,
    notifyAbilityRemoved,
    notifyLineRemoved,
    notifyTextRemoved,
    notifyImageRemoved,
    notifyToolIconRemoved,
    notifyConnLineRemoved,
  } = useCollaborativeCanvas();

  const resetAgents = async () => {
    const connectedAgentIds = new Set(
      connectingLines.flatMap((line) => [line.fromId, line.toId]),
    );
    const toKeep = new Set<string>(connectedAgentIds);
    const removedAgents = agentsOnCanvas.filter(
      (agent) => !toKeep.has(agent.id),
    );

    setAgentsOnCanvas(agentsOnCanvas.filter((agent) => toKeep.has(agent.id)));
    removedAgents.forEach((agent) => notifyAgentRemoved(agent.id));
  };

  const resetAbilities = async () => {
    const connectedAbilityIds = new Set(
      connectingLines.flatMap((line) => [line.fromId, line.toId]),
    );
    const removedAbilities = abilitiesOnCanvas.filter(
      (ability) => !connectedAbilityIds.has(ability.id),
    );

    setAbilitiesOnCanvas(
      abilitiesOnCanvas.filter((ability) =>
        connectedAbilityIds.has(ability.id),
      ),
    );
    removedAbilities.forEach((ability) => notifyAbilityRemoved(ability.id));

    setToolIconsOnCanvas([]);
    toolIconsOnCanvas.forEach((toolIcon) => notifyToolIconRemoved(toolIcon.id));
  };

  const resetDrawings = async () => {
    setDrawLines([]);
    drawLines.forEach((line) => notifyLineRemoved(line.id));
  };

  const resetTexts = async () => {
    setTextsOnCanvas([]);
    textsOnCanvas.forEach((text) => notifyTextRemoved(text.id));
  };

  const resetImages = async () => {
    setImagesOnCanvas([]);
    imagesOnCanvas.forEach((image) => notifyImageRemoved(image.id));
  };

  const resetLineups = async () => {
    const connectedIds = new Set(
      connectingLines.flatMap((line) => [line.fromId, line.toId]),
    );
    const removedAgents = agentsOnCanvas.filter((agent) =>
      connectedIds.has(agent.id),
    );
    const removedAbilities = abilitiesOnCanvas.filter((ability) =>
      connectedIds.has(ability.id),
    );

    setAgentsOnCanvas(
      agentsOnCanvas.filter((agent) => !connectedIds.has(agent.id)),
    );
    removedAgents.forEach((agent) => notifyAgentRemoved(agent.id));

    setAbilitiesOnCanvas(
      abilitiesOnCanvas.filter((ability) => !connectedIds.has(ability.id)),
    );
    removedAbilities.forEach((ability) => notifyAbilityRemoved(ability.id));

    setConnectingLines([]);
    connectingLines.forEach((line) => notifyConnLineRemoved(line.id));
  };

  const handleResetState = async () => {
    resetState();
    notifyCanvasClear();
  };

  return (
    <div className="space-y-1 mt-6">
      <div className="flex flex-col items-center gap-4 p-2 justify-center">
        <Button
          data-tour="clear-canvas"
          variant="destructive"
          className="w-full"
          onClick={handleResetState}
        >
          Delete All
        </Button>
        <div className="grid grid-cols-3 gap-2 w-full">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="destructiveOutline"
                onClick={resetAgents}
                className="w-full"
              >
                <Users />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" align="center">
              Delete Agents
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="destructiveOutline"
                onClick={resetAbilities}
                className="w-full"
              >
                <Swords />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" align="center">
              Delete Abilites
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="destructiveOutline"
                onClick={resetDrawings}
                className="w-full"
              >
                <Pencil />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" align="center">
              Delete Drawings
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="destructiveOutline"
                onClick={resetTexts}
                className="w-full"
              >
                <ALargeSmall />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center">
              Delete Texts
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="destructiveOutline"
                onClick={resetImages}
                className="w-full"
              >
                <ImageIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center">
              Delete Images
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="destructiveOutline"
                onClick={resetLineups}
                className="w-full"
              >
                <MapPinned />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center">
              Delete Lineups
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};
