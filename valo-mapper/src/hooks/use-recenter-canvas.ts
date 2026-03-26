import { useCallback } from "react";
import { VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from "@/lib/consts/misc/consts";
import { MapStageHandle } from "@/components/canvas";

export const useRecenterCanvas = (
  stageRef?: React.RefObject<MapStageHandle | null>,
): (() => void) => {
  return useCallback(() => {
    const stageHandle = stageRef?.current;
    if (!stageHandle) return;

    const stage = stageHandle.stage;
    if (!stage) return;

    const container = stage.container();
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;

    const scaleX = containerWidth / VIRTUAL_WIDTH;
    const scaleY = containerHeight / VIRTUAL_HEIGHT;
    const baseScale = Math.min(scaleX, scaleY);

    const scaledWidth = VIRTUAL_WIDTH * baseScale;
    const scaledHeight = VIRTUAL_HEIGHT * baseScale;

    const x = (containerWidth - scaledWidth) / 2;
    const y = (containerHeight - scaledHeight) / 2;

    stage.position({ x, y });
    stage.scale({ x: baseScale, y: baseScale });
    stage.batchDraw();

    stageHandle.handleDragMove();
  }, [stageRef]);
};
