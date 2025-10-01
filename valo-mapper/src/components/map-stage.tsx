import { AbilityIcon, CanvasIcon } from "@/components/canvas-icons";
import { ContextMenuPopover } from "@/components/context-menu-popover";
import { useCanvas } from "@/contexts/canvas-context";
import { useSettings } from "@/contexts/settings-context";
import { useKonva } from "@/hooks/use-konva";
import Konva from "konva";
import { Stage as KonvaStage } from "konva/lib/Stage";
import { Vector2d } from "konva/lib/types";
import { Ref, useCallback, useEffect, useRef } from "react";
import {
  Arrow,
  Group,
  Image as KonvaImage,
  Layer,
  Line,
  Rect,
  Stage,
  Text,
  Transformer,
} from "react-konva";
import useImage from "use-image";
import { TextEditor } from "./text-editor";
import { KonvaEventObject } from "konva/lib/Node";
import { MAP_SIZE } from "@/lib/consts";

interface MapStageProps {
  width: number;
  height: number;
  mapPosition: Vector2d;
}

export const MapStage = ({ width, height, mapPosition }: MapStageProps) => {
  const {
    agentsOnCanvas,
    setAgentsOnCanvas,
    abilitiesOnCanvas,
    setAbilitiesOnCanvas,
    selectedMap,
    drawLines,
    isDrawMode,
    currentStroke,
    textsOnCanvas,
    setTextsOnCanvas,
    editingTextId,
    setEditingTextId,
    imagesOnCanvas,
    setImagesOnCanvas,
  } = useCanvas();

  const textRefs = useRef<Map<string, Konva.Text>>(new Map());
  const transformerRefs = useRef<Map<string, Konva.Transformer>>(new Map());
  const imageNodeRefs = useRef<Map<string, Konva.Image>>(new Map());
  const imageLoaderRefs = useRef<Map<string, HTMLImageElement>>(new Map());

  const attachTransformerToText = useCallback(
    (textNode: Konva.Text | null, transformerId: string) => {
      if (textNode) {
        const transformer = transformerRefs.current.get(transformerId);
        if (transformer) {
          transformer.nodes([textNode]);
          transformer.getLayer()?.batchDraw();
        }
      }
    },
    []
  );

  const handleTextClick = useCallback(
    (textId: string) => {
      setEditingTextId(textId);
      setAbilitiesOnCanvas([]);
    },
    [setEditingTextId, setAbilitiesOnCanvas]
  );

  const handleTextTransform = useCallback((textId: string) => {
    const textNode = textRefs.current.get(textId);
    if (!textNode) return;

    const scaleX = textNode.scaleX();
    const newWidth = textNode.width() * scaleX;

    textNode.setAttrs({
      width: newWidth,
      scaleX: 1,
    });
  }, []);

  const handleTextTransformEnd = useCallback(
    (textId: string) => {
      const textNode = textRefs.current.get(textId);
      if (!textNode) return;

      setTextsOnCanvas((prev) =>
        prev.map((item) =>
          item.id === textId ? { ...item, width: textNode.width() } : item
        )
      );
    },
    [setTextsOnCanvas]
  );

  const handleTextChange = (textId: string, newText: string) => {
    setTextsOnCanvas((prev) =>
      prev.map((item) =>
        item.id === textId ? { ...item, text: newText } : item
      )
    );
  };

  const handleTextEditComplete = useCallback(() => {
    setEditingTextId(null);
  }, [setEditingTextId]);

  const handleImageTransform = useCallback((imageId: string) => {
    const imageNode = imageNodeRefs.current.get(imageId);
    if (!imageNode) return;

    const scaleX = imageNode.scaleX();
    const scaleY = imageNode.scaleY();
    const newWidth = Math.max(5, imageNode.width() * scaleX);
    const newHeight = Math.max(5, imageNode.height() * scaleY);

    imageNode.setAttrs({
      width: newWidth,
      height: newHeight,
      scaleX: 1,
      scaleY: 1,
    });
  }, []);

  const handleImageTransformEnd = useCallback(
    (imageId: string) => {
      const imageNode = imageNodeRefs.current.get(imageId);
      if (!imageNode) return;

      setImagesOnCanvas((prev) =>
        prev.map((item) =>
          item.id === imageId
            ? {
                ...item,
                width: imageNode.width(),
                height: imageNode.height(),
              }
            : item
        )
      );
    },
    [setImagesOnCanvas]
  );

  const handleImageDragEnd = useCallback(
    (imageId: string, e: KonvaEventObject<DragEvent>) => {
      if (!e.target) return;
      const newX = e.target.x();
      const newY = e.target.y();

      setImagesOnCanvas((prev) =>
        prev.map((item) =>
          item.id === imageId ? { ...item, x: newX, y: newY } : item
        )
      );
    },
    [setImagesOnCanvas]
  );

  const handleTextDragEnd = useCallback(
    (textId: string, e: KonvaEventObject<DragEvent>) => {
      if (!e.target) return;
      const newX = e.target.x();
      const newY = e.target.y();

      setTextsOnCanvas((prev) =>
        prev.map((item) =>
          item.id === textId ? { ...item, x: newX, y: newY } : item
        )
      );
    },
    [setTextsOnCanvas]
  );

  const { agentsSettings, abilitiesSettings } = useSettings();

  const [mapImage] = useImage(selectedMap.minimap_src);

  useEffect(() => {
    imagesOnCanvas.forEach((imageItem) => {
      if (!imageLoaderRefs.current.has(imageItem.id)) {
        const img = new window.Image();
        img.src = imageItem.src;
        imageLoaderRefs.current.set(imageItem.id, img);
      }
    });
  }, [imagesOnCanvas]);

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
    currentLineRef,
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
        isListening={!isDrawMode}
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
        isListening={!isDrawMode}
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

  const renderImages = () =>
    imagesOnCanvas.map((imageItem) => (
      <Group
        key={imageItem.id}
        id={imageItem.id}
        draggable={!isDrawMode}
        x={imageItem.x}
        y={imageItem.y}
        onDragEnd={(e) => handleImageDragEnd(imageItem.id, e)}
      >
        <KonvaImage
          ref={(node) => {
            if (node) {
              imageNodeRefs.current.set(imageItem.id, node);
            } else {
              imageNodeRefs.current.delete(imageItem.id);
            }
          }}
          image={imageLoaderRefs.current.get(imageItem.id)}
          width={imageItem.width}
          height={imageItem.height}
          onTransform={() => handleImageTransform(imageItem.id)}
          onTransformEnd={() => handleImageTransformEnd(imageItem.id)}
        />
        <Transformer
          ref={(node) => {
            if (node) {
              transformerRefs.current.set(imageItem.id, node);
              if (imageNodeRefs.current.get(imageItem.id)) {
                node.nodes([imageNodeRefs.current.get(imageItem.id)!]);
              }
            } else {
              transformerRefs.current.delete(imageItem.id);
            }
          }}
          boundBoxFunc={(_, newBox) => ({
            ...newBox,
            width: Math.max(5, newBox.width),
            height: Math.max(5, newBox.height),
          })}
          rotateEnabled={false}
          borderEnabled={false}
          enabledAnchors={["bottom-right"]}
        />
      </Group>
    ));

  const renderTexts = () =>
    textsOnCanvas.map((textItem) => (
      <Group
        key={textItem.id}
        id={textItem.id}
        draggable={!isDrawMode && editingTextId !== textItem.id}
        x={textItem.x}
        y={textItem.y}
        onClick={(e: KonvaEventObject<MouseEvent>) => {
          // Only handle left clicks
          if (e.evt.button === 0) {
            handleTextClick(textItem.id);
          }
        }}
        onDragEnd={(e) => handleTextDragEnd(textItem.id, e)}
      >
        <Rect
          width={textItem.width}
          height={Math.max(
            60,
            textRefs.current.get(textItem.id)?.height() || 0
          )}
        />
        <Text
          ref={(node) => {
            if (node) {
              textRefs.current.set(textItem.id, node);
              attachTransformerToText(node, textItem.id);
            } else {
              textRefs.current.delete(textItem.id);
            }
          }}
          onTransform={() => handleTextTransform(textItem.id)}
          onTransformEnd={() => handleTextTransformEnd(textItem.id)}
          text={textItem.text || "Click to add text..."}
          fontSize={18}
          padding={10}
          width={textItem.width}
          visible={editingTextId !== textItem.id}
          fill={textItem.text ? "#ffffff" : "#52525b"}
          sceneFunc={function (context, shape) {
            context.fillStyle = "#18181b";
            const radius = 8;
            context.beginPath();
            context.roundRect(
              0,
              0,
              shape.width(),
              Math.max(60, shape.height()),
              radius
            );
            context.closePath();
            context.fill();
            (shape as Konva.Text)._sceneFunc(context);
          }}
        />
        {editingTextId === textItem.id ? (
          <TextEditor
            textNode={textRefs.current.get(textItem.id)!}
            text={textItem.text || ""}
            onChange={(value) => handleTextChange(textItem.id, value)}
            onClose={handleTextEditComplete}
          />
        ) : (
          <Transformer
            ref={(node) => {
              if (node) {
                transformerRefs.current.set(textItem.id, node);
                const textNode = textRefs.current.get(textItem.id);
                if (textNode) {
                  node.nodes([textNode]);
                  node.getLayer()?.batchDraw();
                }
              } else {
                transformerRefs.current.delete(textItem.id);
              }
            }}
            enabledAnchors={["middle-right"]}
            rotateEnabled={false}
            borderEnabled={false}
            anchorFill="#27272a"
            anchorStroke="#18181b"
            anchorStyleFunc={(anchor) => {
              if (anchor.hasName("middle-right")) {
                const transformer = transformerRefs.current.get(textItem.id);
                if (transformer) {
                  const h = transformer.height();
                  const scale = stageRef.current?.scaleX() ?? 1;
                  anchor.cornerRadius(10 * scale);
                  anchor.width(10 * scale);
                  anchor.height(Math.max(50 * scale, h - 10));
                  anchor.offsetX((10 * scale) / 2);
                  anchor.offsetY((h - 10 * scale) / 2);
                }
              }
            }}
            boundBoxFunc={(_, newBox) => ({
              ...newBox,
              width: Math.max(100, newBox.width),
            })}
          />
        )}
      </Group>
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
              width={MAP_SIZE}
              height={MAP_SIZE}
              x={mapPosition.x + MAP_SIZE / 2}
              y={mapPosition.y + MAP_SIZE / 2}
              offsetX={MAP_SIZE / 2}
              offsetY={MAP_SIZE / 2}
              scale={{ x: 1.25, y: 1.25 }}
            />
          )}
        </Layer>
        <Layer isListening={!isDrawMode}>
          {renderAbilities()}
          {renderAgents()}
          {renderImages()}
          {renderTexts()}
        </Layer>
        <Layer isListening={isDrawMode}>
          {drawLines.map((line, i) => {
            return line.isArrowHead && line.tool !== "eraser" ? (
              <Arrow
                key={i}
                isListening={false}
                perfectDrawEnabled={false}
                points={line.points.flatMap((point) => [point.x, point.y])}
                stroke={line.color}
                strokeWidth={line.size}
                dash={line.isDashed ? [15, 10] : []}
                tension={1}
                globalCompositeOperation={"source-over"}
              />
            ) : (
              <Line
                key={i}
                isListening={false}
                perfectDrawEnabled={false}
                points={line.points.flatMap((point) => [point.x, point.y])}
                stroke={line.color}
                strokeWidth={line.size}
                dash={line.isDashed && line.tool !== "eraser" ? [15, 10] : []}
                tension={1}
                globalCompositeOperation={
                  line.tool === "eraser" ? "destination-out" : "source-over"
                }
              />
            );
          })}

          {currentStroke &&
            (currentStroke.isArrowHead && currentStroke.tool !== "eraser" ? (
              <Arrow
                ref={currentLineRef as Ref<Konva.Arrow>}
                points={currentStroke.points.flatMap((point) => [
                  point.x,
                  point.y,
                ])}
                isListening={false}
                perfectDrawEnabled={false}
                tension={1}
                stroke={currentStroke.color}
                strokeWidth={currentStroke.size}
                dash={currentStroke.isDashed ? [15, 10] : []}
                globalCompositeOperation={"source-over"}
              />
            ) : (
              <Line
                ref={currentLineRef}
                points={currentStroke.points.flatMap((point) => [
                  point.x,
                  point.y,
                ])}
                isListening={false}
                perfectDrawEnabled={false}
                tension={1}
                stroke={currentStroke.color}
                strokeWidth={currentStroke.size}
                dash={
                  currentStroke.isDashed && currentStroke.tool !== "eraser"
                    ? [15, 10]
                    : []
                }
                globalCompositeOperation={
                  currentStroke.tool === "eraser"
                    ? "destination-out"
                    : "source-over"
                }
              />
            ))}
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
