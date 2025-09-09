import { useCanvas } from "@/contexts/canvas-context";
import { useSettings } from "@/contexts/settings-context";
import { useKonva } from "@/hooks/use-konva";
import { Stage as KonvaStage } from "konva/lib/Stage";
import { Vector2d } from "konva/lib/types";
import { useRef } from "react";
import { Image as KonvaImage, Layer, Stage } from "react-konva";
import { AbilityIcon, CanvasIcon } from "./canvas";

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
  } = useKonva(stageRef);

  const renderAgents = () =>
    agentsOnCanvas.map((agent) => (
      <CanvasIcon
        key={agent.id}
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

  return (
    <Stage
      width={width}
      height={height}
      ref={stageRef}
      onWheel={handleWheel}
      draggable
      onMouseMove={handleStageMouseMove}
      onMouseDown={handleStageClick}
      onMouseLeave={handleStageMouseLeave}
    >
      <Layer>
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
  );
};
