import { useCanvas } from "@/contexts/canvas-context";
import { MAP_SIZE, WEAPONS } from "@/lib/consts";
import { getNextId } from "@/lib/utils";
import { Vector2d } from "konva/lib/types";
import { ToolIconButton } from "./tool-icon-button";
import { WeaponColumn } from "./weapon-column";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface IconsSectionProps {
  mapPosition: Vector2d;
}

export const IconsSection = ({ mapPosition }: IconsSectionProps) => {
  const { setEditingTextId, setIsDrawMode, setToolIconsOnCanvas } = useCanvas();

  const handleAddToolIcon = (name: string, width: number, height: number) => {
    setEditingTextId(null);
    setIsDrawMode(false);

    setToolIconsOnCanvas((prev) => [
      ...prev,
      {
        id: getNextId("text"),
        x: mapPosition.x + MAP_SIZE / 2 + Math.round(Math.random() * 20),
        y: mapPosition.y + MAP_SIZE / 2 + Math.round(Math.random() * 20),
        name,
        width,
        height,
      },
    ]);
  };

  return (
    <div className="mt-4" data-tour="icons-section">
      <div className="flex items-center justify-between mb-4">
        <span className="text-base font-semibold">Icons</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="inline-flex items-center justify-center"
              type="button"
            >
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-2">
              <p>Press E while hovering an icon on the map to delete it</p>
              <p>Click an icon to place it on the map</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>

      <Accordion type="multiple" className="w-full">
        <AccordionItem value="utilities">
          <AccordionTrigger className="text-sm">Spike</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-5 gap-2 pt-2">
              <ToolIconButton
                name="spike"
                onClick={() => handleAddToolIcon("spike", 32, 32)}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="weapons">
          <AccordionTrigger className="text-sm">Guns</AccordionTrigger>
          <AccordionContent>
            <div className="flex gap-4 pt-2">
              <WeaponColumn
                weapons={WEAPONS.sidearms}
                onClick={handleAddToolIcon}
              />
              <WeaponColumn
                weapons={[...WEAPONS.smgs, ...WEAPONS.shotguns]}
                onClick={handleAddToolIcon}
              />
              <WeaponColumn
                weapons={WEAPONS.rifles}
                onClick={handleAddToolIcon}
              />
              <WeaponColumn
                weapons={[...WEAPONS.snipers, ...WEAPONS.machineGuns]}
                onClick={handleAddToolIcon}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="shields">
          <AccordionTrigger className="text-sm">Shields</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-5 gap-2 pt-2">
              <ToolIconButton
                name="light_shield"
                onClick={() => handleAddToolIcon("light_shield", 32, 32)}
              />
              <ToolIconButton
                name="regen_shield"
                onClick={() => handleAddToolIcon("regen_shield", 32, 32)}
              />
              <ToolIconButton
                name="heavy_shield"
                onClick={() => handleAddToolIcon("heavy_shield", 32, 32)}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
