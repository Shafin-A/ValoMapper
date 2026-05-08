import Image from "next/image";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSettings } from "@/contexts/settings-context";
import {
  getTraversalSelection,
  TRAVERSAL_TIME_BY_PARTS,
  TRAVERSAL_WEAPON_OPTIONS,
} from "@/lib/consts";
import type { TraversalWeapon } from "@/lib/types";
import { cn, debounce } from "@/lib/utils";
import {
  Circle,
  LineSquiggle,
  Minus,
  MoreHorizontal,
  MoveUpRight,
  Square,
} from "lucide-react";
import { useMemo } from "react";

const TraversalWeaponIcon = ({
  weapon,
  imageSrc,
  imageAlt,
  label,
}: {
  weapon: TraversalWeapon;
  imageSrc?: string;
  imageAlt?: string;
  label: string;
}) => {
  const isKnife = weapon === "knife";

  if (imageSrc) {
    return (
      <span className="relative flex size-[22px] items-center justify-center">
        <span className="relative block size-[22px] overflow-hidden">
          <Image
            src={imageSrc}
            alt={imageAlt ?? label}
            fill
            className={cn(
              "object-contain p-px drop-shadow-[0_0_1px_rgba(255,255,255,0.35)]",
              isKnife ? "scale-[1.1]" : "scale-[1.34]",
            )}
            sizes="22px"
            draggable={false}
          />
        </span>
      </span>
    );
  }

  return <span className="text-[10px] font-semibold leading-none">T</span>;
};

export const DrawSettings = () => {
  const { drawSettings, updateDrawSettings } = useSettings();
  const selectedTraversal = getTraversalSelection(drawSettings.traversalTime);
  const traversalMovement = selectedTraversal.movement ?? "run";
  const traversalMovementDisabled = selectedTraversal.weapon === null;

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
        <span className="text-sm font-medium w-20">Opacity</span>
        <Slider
          value={[Math.round(drawSettings.opacity * 100)]}
          onValueChange={(value) =>
            updateDrawSettings({ opacity: value[0] / 100 })
          }
          max={100}
          min={10}
          step={10}
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
                className="rounded-none border-x"
              >
                <Square />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent side="bottom">Rectangle</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                size="sm"
                data-state={drawSettings.shape === "circle" ? "on" : "off"}
                pressed={drawSettings.shape === "circle"}
                onPressedChange={(pressed) => {
                  if (pressed && drawSettings.shape !== "circle") {
                    updateDrawSettings({ shape: "circle" });
                  }
                }}
                className="rounded-l-none"
              >
                <Circle />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent side="bottom">Ellipse</TooltipContent>
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

      <div className="flex items-center gap-6 p-2">
        <span className="text-sm font-medium w-20">Traversal Time</span>
        <div className="flex items-center gap-2">
          <div className="flex border rounded-md">
            {TRAVERSAL_WEAPON_OPTIONS.map((option, optionIndex) => {
              const isSelected = selectedTraversal.weapon === option.value;
              const isFirst = optionIndex === 0;
              const isLast =
                optionIndex === TRAVERSAL_WEAPON_OPTIONS.length - 1;

              return (
                <Tooltip key={option.value}>
                  <TooltipTrigger asChild>
                    <Toggle
                      size="sm"
                      aria-label={`Traversal weapon ${option.label}`}
                      data-state={isSelected ? "on" : "off"}
                      pressed={isSelected}
                      onPressedChange={(pressed) => {
                        updateDrawSettings({
                          traversalTime: pressed
                            ? TRAVERSAL_TIME_BY_PARTS[option.value][
                                selectedTraversal.movement ?? "run"
                              ]
                            : null,
                        });
                      }}
                      className={cn(
                        "w-10 px-0",
                        isFirst && "rounded-r-none border-r",
                        !isFirst && !isLast && "rounded-none border-x",
                        isLast && "rounded-l-none",
                      )}
                    >
                      <TraversalWeaponIcon weapon={option.value} {...option} />
                    </Toggle>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {option.label} Speed
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          <div
            className={cn(
              "flex items-center gap-2",
              traversalMovementDisabled && "opacity-50",
            )}
          >
            <Switch
              aria-label="Traversal movement"
              checked={traversalMovement === "run"}
              disabled={traversalMovementDisabled}
              onCheckedChange={(checked) => {
                if (selectedTraversal.weapon === null) {
                  return;
                }

                updateDrawSettings({
                  traversalTime:
                    TRAVERSAL_TIME_BY_PARTS[selectedTraversal.weapon][
                      checked ? "run" : "walk"
                    ],
                });
              }}
            />
            <span className="text-sm transition-colors">
              {traversalMovement === "run" ? "Run" : "Walk"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
