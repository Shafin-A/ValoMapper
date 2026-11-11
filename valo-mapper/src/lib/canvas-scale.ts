import { MAP_SIZE } from "@/lib/consts";
import { VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from "@/lib/consts/misc/consts";
import { CANVAS_MAP_RENDER_SCALE } from "@/lib/map-positioning";

const MOBILE_MAP_PADDING = 24;
const MAP_RENDER_EXTENT = MAP_SIZE * CANVAS_MAP_RENDER_SCALE;

export const getCanvasFitScale = (
  containerWidth: number,
  containerHeight: number,
  fitMap = false,
) => {
  if (fitMap) {
    const availableWidth = Math.max(
      containerWidth - MOBILE_MAP_PADDING * 2,
      1,
    );
    const availableHeight = Math.max(
      containerHeight - MOBILE_MAP_PADDING * 2,
      1,
    );

    return Math.min(
      availableWidth / MAP_RENDER_EXTENT,
      availableHeight / MAP_RENDER_EXTENT,
    );
  }

  return Math.min(
    containerWidth / VIRTUAL_WIDTH,
    containerHeight / VIRTUAL_HEIGHT,
  );
};
