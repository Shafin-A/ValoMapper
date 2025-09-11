import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCanvas } from "@/contexts/canvas-context";
import { useSettings } from "@/contexts/settings-context";
import { useKonva } from "@/hooks/use-konva";
import { Stage as KonvaStage } from "konva/lib/Stage";
import { Vector2d } from "konva/lib/types";
import { Copy, Heart, HeartCrack, Trash2 } from "lucide-react";
import { useRef } from "react";
import { Image as KonvaImage, Layer, Stage } from "react-konva";
import { CanvasIcon, AbilityIcon } from "./canvas-icons";

type MapStageProps = {
  width: number;
  height: number;
  mapImage: HTMLImageElement | undefined;
  mapPosition: Vector2d;
  mapSize: number;
};

export const MapStage = ({
  width,
  height,
  mapImage,
  mapPosition,
  mapSize,
}: MapStageProps) => {
  const {
    agentsOnCanvas,
    setAgentsOnCanvas,
    abilitiesOnCanvas,
    setAbilitiesOnCanvas,
  } = useCanvas();

  const { agentsSettings, abilitiesSettings } = useSettings();

  const stageRef = useRef<KonvaStage | null>(null);

  const {
    handleWheel,
    handleDragEnd,
    handleStageClick,
    handleStageMouseLeave,
    handleStageMouseMove,
    handleContextMenu,
    handleDelete,
    handleDuplicate,
    handleToggleAlly,
    handlePopoverOpenChange,
    contextMenu,
  } = useKonva(stageRef);

  const renderAgents = () =>
    agentsOnCanvas.map((agent) => (
      <CanvasIcon
        key={agent.id}
        id={agent.id}
        isAlly={agent.isAlly}
        x={agent.x}
        y={agent.y}
        src={agent.src}
        draggable
        onDragEnd={(e) => handleDragEnd(e, agent, setAgentsOnCanvas)}
        width={agentsSettings.scale}
        height={agentsSettings.scale}
        opacity={agentsSettings.boxOpacity}
        radius={agentsSettings.radius}
        allyColor={agentsSettings.allyColor}
        enemyColor={agentsSettings.enemyColor}
      />
    ));

  const renderAbilities = () =>
    abilitiesOnCanvas.map((ability) => (
      <AbilityIcon
        key={ability.id}
        id={ability.id}
        isAlly={ability.isAlly}
        action={ability.action}
        x={ability.x}
        y={ability.y}
        src={ability.src}
        draggable
        onDragEnd={(e) => handleDragEnd(e, ability, setAbilitiesOnCanvas)}
        width={abilitiesSettings.scale}
        height={abilitiesSettings.scale}
        opacity={abilitiesSettings.boxOpacity}
        radius={abilitiesSettings.radius}
        allyColor={abilitiesSettings.allyColor}
        enemyColor={abilitiesSettings.enemyColor}
      />
    ));

  const currentItem = contextMenu.open
    ? contextMenu.itemType === "agent"
      ? agentsOnCanvas.find((a) => a.id === contextMenu.itemId)
      : abilitiesOnCanvas.find((a) => a.id === contextMenu.itemId)
    : null;

  return (
    <div style={{ position: "relative" }}>
      <Stage
        width={width}
        height={height}
        ref={stageRef}
        onWheel={handleWheel}
        draggable
        onMouseMove={handleStageMouseMove}
        onMouseDown={handleStageClick}
        onMouseLeave={handleStageMouseLeave}
        onContextMenu={handleContextMenu}
      >
        <Layer isListening={false}>
          {mapImage && (
            <KonvaImage
              image={mapImage}
              width={mapSize}
              height={mapSize}
              x={mapPosition.x}
              y={mapPosition.y}
            />
          )}
        </Layer>
        <Layer>
          {renderAgents()}
          {renderAbilities()}
        </Layer>
      </Stage>

      <Popover open={contextMenu.open} onOpenChange={handlePopoverOpenChange}>
        <PopoverTrigger asChild>
          <div
            style={{
              position: "fixed",
              left: contextMenu.x,
              top: contextMenu.y,
              width: 1,
              height: 1,
              pointerEvents: "none",
            }}
          />
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-2"
          side="top"
          align="start"
          sideOffset={4}
        >
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={handleDuplicate}
              title={`Duplicate ${
                contextMenu.itemType === "agent" ? "Agent" : "Ability"
              }`}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={handleToggleAlly}
              title={currentItem?.isAlly ? "Make Enemy" : "Make Ally"}
            >
              {currentItem?.isAlly ? (
                <HeartCrack className="h-4 w-4" />
              ) : (
                <Heart className="h-4 w-4" />
              )}
            </Button>
            <div className="w-px h-6 bg-border" />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleDelete}
              title={`Delete ${
                contextMenu.itemType === "agent" ? "Agent" : "Ability"
              }`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
