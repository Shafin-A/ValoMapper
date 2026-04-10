import { Slider } from "@/components/ui/slider";
import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSettings } from "@/contexts/settings-context";
import { debounce } from "@/lib/utils";
import {
  LineSquiggle,
  Minus,
  MoreHorizontal,
  MoveUpRight,
  Square,
} from "lucide-react";
import { useMemo } from "react";

export const DrawSettings = () => {
  const { drawSettings, updateDrawSettings } = useSettings();

  const debouncedSetColor = useMemo(
    () => debounce((color: string) => updateDrawSettings({ color }), 16),
    [updateDrawSettings],
  );

  return (
    <div className="space-y-1 mt-6">
      <div className="flex items-center gap-6 p-2">
        <span className="text-sm font-medium w-20">Size</span>
        <Slider
          value={[drawSettings.size]}
          onValueChange={(value) => updateDrawSettings({ size: value[0] })}
          max={10}
          min={1}
          step={1}
          className="flex-1"
        />
      </div>

      <div className="flex items-center gap-6 p-2">
        <span className="text-sm font-medium w-20">Color</span>
        <input
          type="color"
          value={drawSettings.color}
          onChange={(e) => debouncedSetColor(e.target.value)}
          className="h-6 w-6 cursor-pointer rounded"
        />
      </div>

      <div className="flex items-center gap-6 p-2">
        <span className="text-sm font-medium w-20">Shape</span>
        <div className="flex border rounded-md">
          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                size="sm"
                data-state={drawSettings.shape === "freehand" ? "on" : "off"}
                pressed={drawSettings.shape === "freehand"}
                onPressedChange={(pressed) => {
                  if (pressed && drawSettings.shape !== "freehand") {
                    updateDrawSettings({ shape: "freehand" });
                  }
                }}
                className="rounded-r-none border-r"
              >
                <LineSquiggle />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent side="bottom">Free Draw</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                size="sm"
                data-state={drawSettings.shape === "straight" ? "on" : "off"}
                pressed={drawSettings.shape === "straight"}
                onPressedChange={(pressed) => {
                  if (pressed && drawSettings.shape !== "straight") {
                    updateDrawSettings({ shape: "straight" });
                  }
                }}
                className="rounded-none border-x"
              >
                <Minus />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent side="bottom">Straight Line</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                size="sm"
                data-state={drawSettings.shape === "rectangle" ? "on" : "off"}
                pressed={drawSettings.shape === "rectangle"}
                onPressedChange={(pressed) => {
                  if (pressed && drawSettings.shape !== "rectangle") {
                    updateDrawSettings({ shape: "rectangle" });
                  }
                }}
                className="rounded-l-none"
              >
                <Square />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent side="bottom">Rectangle</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="flex items-center gap-6 p-2">
        <span className="text-sm font-medium w-20">Stroke</span>
        <div className="flex gap-2">
          <div className="flex border rounded-md">
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  size="sm"
                  data-state={drawSettings.isDashed ? "off" : "on"}
                  pressed={!drawSettings.isDashed}
                  onPressedChange={(pressed) => {
                    if (pressed && drawSettings.isDashed) {
                      updateDrawSettings({ isDashed: false });
                    }
                  }}
                  className="rounded-r-none border-r"
                >
                  <Minus className="rotate-135" />
                </Toggle>
              </TooltipTrigger>
              <TooltipContent side="bottom">Solid Line</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  size="sm"
                  data-state={drawSettings.isDashed ? "on" : "off"}
                  pressed={drawSettings.isDashed}
                  onPressedChange={(pressed) => {
                    if (pressed && !drawSettings.isDashed) {
                      updateDrawSettings({ isDashed: true });
                    }
                  }}
                  className="rounded-l-none"
                >
                  <MoreHorizontal className="rotate-135" />
                </Toggle>
              </TooltipTrigger>
              <TooltipContent side="bottom">Dashed Line</TooltipContent>
            </Tooltip>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                size="sm"
                data-state={drawSettings.isArrowHead ? "on" : "off"}
                pressed={drawSettings.isArrowHead}
                onPressedChange={(pressed) => {
                  updateDrawSettings({ isArrowHead: pressed });
                }}
              >
                <MoveUpRight />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent side="bottom">Arrow Head</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};
