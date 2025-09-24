import { AbilityIcon, CanvasIcon } from "@/components/canvas-icons";
import { ContextMenuPopover } from "@/components/context-menu-popover";
import { useCanvas } from "@/contexts/canvas-context";
import { useSettings } from "@/contexts/settings-context";
import { useKonva } from "@/hooks/use-konva";
import { Stage as KonvaStage } from "konva/lib/Stage";
import { Vector2d } from "konva/lib/types";
import { useRef } from "react";
import { Image as KonvaImage, Layer, Line, Stage } from "react-konva";
import useImage from "use-image";

interface MapStageProps {
  width: number;
  height: number;
  mapPosition: Vector2d;
  mapSize: number;
}

export const MapStage = ({
  width,
  height,
  mapPosition,
  mapSize,
}: MapStageProps) => {
  const {
    agentsOnCanvas,
    setAgentsOnCanvas,
    abilitiesOnCanvas,
    setAbilitiesOnCanvas,
    selectedMap,
    drawLines,
    isDrawMode,
    currentStroke,
  } = useCanvas();

  const { agentsSettings, abilitiesSettings } = useSettings();

  const [mapImage] = useImage(selectedMap.minimap_src);

  const stageRef = useRef<KonvaStage | null>(null);

  const {
    handleWheel,
    handleDragEnd,
    handleStageClick,
    handleStageMouseLeave,
    handleStageMouseMove,
    handleMouseUp,
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
        draggable={!isDrawMode}
        onDragEnd={(e) => handleDragEnd(e, agent, setAgentsOnCanvas)}
        width={agentsSettings.scale}
        height={agentsSettings.scale}
        borderOpacity={agentsSettings.borderOpacity}
        strokeWidth={agentsSettings.borderWidth}
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
        rotation={ability.currentRotation}
        src={ability.src}
        draggable={!isDrawMode}
        onDragEnd={(e) => handleDragEnd(e, ability, setAbilitiesOnCanvas)}
        width={abilitiesSettings.scale}
        height={abilitiesSettings.scale}
        borderOpacity={abilitiesSettings.borderOpacity}
        strokeWidth={abilitiesSettings.borderWidth}
        radius={abilitiesSettings.radius}
        allyColor={abilitiesSettings.allyColor}
        enemyColor={abilitiesSettings.enemyColor}
        currentPath={ability.currentPath}
        currentLength={ability.currentLength}
      />
    ));

  const currentItem = contextMenu.open
    ? contextMenu.itemType === "agent"
      ? agentsOnCanvas.find((a) => a.id === contextMenu.itemId) ?? null
      : abilitiesOnCanvas.find((a) => a.id === contextMenu.itemId) ?? null
    : null;

  return (
    <div style={{ position: "relative" }}>
      <Stage
        width={width}
        height={height}
        ref={stageRef}
        onWheel={handleWheel}
        draggable={!isDrawMode}
        onMouseMove={handleStageMouseMove}
        onMouseDown={handleStageClick}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleStageMouseLeave}
        onContextMenu={handleContextMenu}
      >
        <Layer isListening={false}>
          {mapImage && (
            <KonvaImage
              image={mapImage}
              width={mapSize}
              height={mapSize}
              x={mapPosition.x + mapSize / 2}
              y={mapPosition.y + mapSize / 2}
              // rotation={180}
              offsetX={mapSize / 2}
              offsetY={mapSize / 2}
              scale={{ x: 1.25, y: 1.25 }}
            />
          )}
        </Layer>
        <Layer isListening={!isDrawMode}>
          {renderAbilities()}
          {renderAgents()}
        </Layer>
        <Layer>
          {drawLines.map((line, i) => {
            return (
              <Line
                key={i}
                points={line.points.flatMap((point) => [point.x, point.y])}
                stroke="#df4b26"
                strokeWidth={5}
                globalCompositeOperation={
                  line.tool === "eraser" ? "destination-out" : "source-over"
                }
              />
            );
          })}

          {currentStroke && currentStroke.points.length > 1 && (
            <Line
              points={currentStroke.points.flatMap((point) => [
                point.x,
                point.y,
              ])}
              stroke={"#df4b26"}
              strokeWidth={5}
              opacity={0.8}
              globalCompositeOperation={
                currentStroke.tool === "eraser"
                  ? "destination-out"
                  : "source-over"
              }
            />
          )}
        </Layer>
      </Stage>

      <ContextMenuPopover
        open={contextMenu.open}
        x={contextMenu.x}
        y={contextMenu.y}
        itemType={contextMenu.itemType}
        currentItem={currentItem}
        onOpenChange={handlePopoverOpenChange}
        onDuplicate={handleDuplicate}
        onToggleAlly={handleToggleAlly}
        onDelete={handleDelete}
      />
    </div>
  );
};
