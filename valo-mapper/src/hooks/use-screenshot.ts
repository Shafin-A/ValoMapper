import { useCallback } from "react";
import { Group } from "konva/lib/Group";
import { toast } from "sonner";
import { VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from "@/lib/consts/misc/consts";
import { MapStageHandle } from "@/components/canvas";

export const useScreenshot = (
  stageRef?: React.RefObject<MapStageHandle | null>,
): (() => void) => {
  return useCallback(() => {
    const stageHandle = stageRef?.current;
    if (!stageHandle) return;

    const stage = stageHandle.stage;
    if (!stage) return;

    try {
      const layers = stage.getLayers();

      const drawLayer = layers.find((layer) => {
        const children = layer.getChildren();
        return children.some(
          (child) =>
            child.getClassName() === "Group" && child.opacity() === 0.5,
        );
      });

      let deleteZone: Group | null = null;
      if (drawLayer) {
        deleteZone = drawLayer
          .getChildren()
          .find(
            (child) =>
              child.getClassName() === "Group" && child.opacity() === 0.5,
          ) as Group | null;

        if (deleteZone) {
          deleteZone.hide();
        }
      }

      const currentPosition = stage.position();
      const currentScale = stage.scale();

      stage.position({ x: 0, y: 0 });
      stage.scale({ x: 1, y: 1 });

      const dataURL = stage.toDataURL({
        x: 0,
        y: 0,
        width: VIRTUAL_WIDTH,
        height: VIRTUAL_HEIGHT,
        pixelRatio: 2,
        mimeType: "image/png",
      });

      stage.position(currentPosition);
      stage.scale(currentScale);

      if (deleteZone) {
        deleteZone.show();
      }

      stage.batchDraw();

      const now = new Date();
      const date = now.toISOString().split("T")[0];
      const time = now.toTimeString().split(" ")[0].replace(/:/g, "-");
      const filename = `valomapper-${date}-${time}.png`;
      const link = document.createElement("a");
      link.download = filename;
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Screenshot saved successfully!", {
        description: filename,
      });
    } catch (error) {
      console.error("Failed to save screenshot:", error);
      toast.error("Failed to save screenshot", {
        description: "Please try again.",
      });
    }
  }, [stageRef]);
};
