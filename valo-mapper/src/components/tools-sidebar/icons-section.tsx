import { useCanvas } from "@/contexts/canvas-context";
import { MAP_SIZE, WEAPONS } from "@/lib/consts";
import { getNextId } from "@/lib/utils";
import { Vector2d } from "konva/lib/types";
import { ToolIconButton } from "./tool-icon-button";
import { WeaponColumn } from "./weapon-column";

interface IconsSectionProps {
  mapPosition: Vector2d;
}

export const IconsSection = ({ mapPosition }: IconsSectionProps) => {
  const { setEditingTextId, setIsDrawMode, setToolIconsOnCanvas } = useCanvas();

  const handleAddToolIcon = () => {
    setEditingTextId(null);
    setIsDrawMode(false);

    setToolIconsOnCanvas((prev) => [
      ...prev,
      {
        id: getNextId("text"),
        x: mapPosition.x + MAP_SIZE / 2 + Math.round(Math.random() * 20),
        y: mapPosition.y + MAP_SIZE / 2 + Math.round(Math.random() * 20),
      },
    ]);
  };

  return (
    <div className="space-y-4 mt-4">
      <span className="text-base font-semibold block">Icons</span>

      <div className="grid grid-cols-5 gap-2">
        <ToolIconButton name="spike" onClick={handleAddToolIcon} />
      </div>

      <div className="flex gap-4">
        <WeaponColumn weapons={WEAPONS.sidearms} onClick={handleAddToolIcon} />
        <WeaponColumn
          weapons={[...WEAPONS.smgs, ...WEAPONS.shotguns]}
          onClick={handleAddToolIcon}
        />
        <WeaponColumn weapons={WEAPONS.rifles} onClick={handleAddToolIcon} />
        <WeaponColumn
          weapons={[...WEAPONS.snipers, ...WEAPONS.machineGuns]}
          onClick={handleAddToolIcon}
        />
      </div>

      <div className="grid grid-cols-5 gap-2">
        <ToolIconButton name="light_shield" onClick={handleAddToolIcon} />
        <ToolIconButton name="regen_shield" onClick={handleAddToolIcon} />
        <ToolIconButton name="heavy_shield" onClick={handleAddToolIcon} />
      </div>
    </div>
  );
};
