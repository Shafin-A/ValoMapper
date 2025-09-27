import { Slider } from "@/components/ui/slider";
import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Minus, MoreHorizontal, MoveUpRight } from "lucide-react";

export const DrawSettings = () => {
  return (
    <div className="space-y-1 mt-6">
      <div className="flex items-center gap-6 p-2">
        <span className="text-sm font-medium w-20">Size</span>
        <Slider
          defaultValue={[5]}
          max={50}
          min={1}
          step={1}
          className="flex-1"
        />
      </div>

      <div className="flex items-center gap-6 p-2">
        <span className="text-sm font-medium w-20">Color</span>
        <input
          type="color"
          defaultValue="#000000"
          className="h-6 w-6 cursor-pointer rounded"
        />
      </div>

      <div className="flex items-center gap-6 p-2">
        <span className="text-sm font-medium w-20">Stroke</span>
        <div className="flex gap-2">
          <div className="flex border rounded-md">
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  size="sm"
                  pressed={true}
                  className="rounded-r-none border-r"
                >
                  <Minus className="rotate-135" />
                </Toggle>
              </TooltipTrigger>
              <TooltipContent side="bottom">Solid Line</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle size="sm" pressed={false} className="rounded-l-none">
                  <MoreHorizontal className="rotate-135" />
                </Toggle>
              </TooltipTrigger>
              <TooltipContent side="bottom">Dashed Line</TooltipContent>
            </Tooltip>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle size="sm" pressed={false}>
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
