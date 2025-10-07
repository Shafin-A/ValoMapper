import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCanvas } from "@/contexts/canvas-context";
import {
  ALargeSmall,
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
  } = useCanvas();

  const resetAgents = () => setAgentsOnCanvas([]);
  const resetAbilities = () => setAbilitiesOnCanvas([]);
  const resetDrawings = () => setDrawLines([]);
  const resetTexts = () => setTextsOnCanvas([]);
  const resetImages = () => setImagesOnCanvas([]);

  return (
    <div className="space-y-1 mt-6">
      <div className="flex flex-col items-center gap-4 p-2 justify-center">
        <Button
          variant="destructive"
          className="w-full"
          onClick={() => resetState()}
        >
          Delete All
        </Button>
        <div className="flex flex-wrap justify-between gap-2 w-full">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="destructiveOutline" onClick={resetAgents}>
                <Users />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center">
              Delete Agents
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="destructiveOutline" onClick={resetAbilities}>
                <Swords />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center">
              Delete Abilites
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="destructiveOutline" onClick={resetDrawings}>
                <Pencil />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center">
              Delete Drawings
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="destructiveOutline" onClick={resetTexts}>
                <ALargeSmall />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center">
              Delete Texts
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="destructiveOutline" onClick={resetImages}>
                <ImageIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center">
              Delete Images
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};
