import { useCallback } from "react";
import { MapStageHandle } from "@/components/canvas";
import { useIsMobile } from "@/hooks/use-mobile";
import { getCanvasFitScale } from "@/lib/canvas-scale";

export const useRecenterCanvas = (
  stageRef?: React.RefObject<MapStageHandle | null>,
): (() => void) => {
  const isMobile = useIsMobile();

  return useCallback(() => {
    const stageHandle = stageRef?.current;
    if (!stageHandle) return;

    const stage = stageHandle.stage;
    if (!stage) return;

    const container = stage.container();
    const host = container.parentElement as HTMLElement | null;
    const containerWidth = host?.offsetWidth ?? container.offsetWidth;
    const containerHeight = host?.offsetHeight ?? container.offsetHeight;

    const stageWidth = stage.width();
    const stageHeight = stage.height();

    const baseScale = getCanvasFitScale(
      containerWidth,
      containerHeight,
      isMobile,
    );

    const scaledWidth = stageWidth * baseScale;
    const scaledHeight = stageHeight * baseScale;

    const x = (containerWidth - scaledWidth) / 2;
    const y = (containerHeight - scaledHeight) / 2;

    stage.position({ x, y });
    stage.scale({ x: baseScale, y: baseScale });
    stage.batchDraw();

    stageHandle.handleDragMove();
  }, [isMobile, stageRef]);
};
