import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCanvas } from "@/contexts/canvas-context";
import { useCollaborativeCanvas } from "@/hooks/use-collaborative-canvas";
import { useWebSocket } from "@/contexts/websocket-context";
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
    setAgentsOnCanvas,
    setAbilitiesOnCanvas,
    setDrawLines,
    setTextsOnCanvas,
    setImagesOnCanvas,
    setToolIconsOnCanvas,
    connectingLines,
    setConnectingLines,
  } = useCanvas();

  const { notifyFullSync } = useCollaborativeCanvas();
  const { users } = useWebSocket();

  const resetAgents = async () => {
    const connectedAgentIds = new Set(
      connectingLines.flatMap((line) => [line.fromId, line.toId]),
    );
    setAgentsOnCanvas((prev) =>
      prev.filter((agent) => connectedAgentIds.has(agent.id)),
    );
    if (users.length > 1) {
      notifyFullSync();
    }
  };

  const resetAbilities = async () => {
    const connectedAbilityIds = new Set(
      connectingLines.flatMap((line) => [line.fromId, line.toId]),
    );
    setAbilitiesOnCanvas((prev) =>
      prev.filter((ability) => connectedAbilityIds.has(ability.id)),
    );
    setToolIconsOnCanvas([]);
    if (users.length > 1) {
      notifyFullSync();
    }
  };

  const resetDrawings = async () => {
    setDrawLines([]);
    if (users.length > 1) {
      notifyFullSync();
    }
  };

  const resetTexts = async () => {
    setTextsOnCanvas([]);
    if (users.length > 1) {
      notifyFullSync();
    }
  };

  const resetImages = async () => {
    setImagesOnCanvas([]);
    if (users.length > 1) {
      notifyFullSync();
    }
  };

  const resetLineups = async () => {
    const connectedIds = new Set(
      connectingLines.flatMap((line) => [line.fromId, line.toId]),
    );
    setAgentsOnCanvas((prev) =>
      prev.filter((agent) => !connectedIds.has(agent.id)),
    );
    setAbilitiesOnCanvas((prev) =>
      prev.filter((ability) => !connectedIds.has(ability.id)),
    );
    setConnectingLines([]);
    if (users.length > 1) {
      notifyFullSync();
    }
  };

  const handleResetState = async () => {
    resetState();
    if (users.length > 1) {
      notifyFullSync();
    }
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
