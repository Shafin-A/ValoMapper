import Image from "next/image";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ColorPickerButton } from "@/components/shared/color-picker-button";
import { useSettings } from "@/contexts/settings-context";
import {
  getTraversalSelection,
  TRAVERSAL_TIME_BY_PARTS,
  TRAVERSAL_WEAPON_OPTIONS,
} from "@/lib/consts";
import type { TraversalWeapon } from "@/lib/types";
import { cn } from "@/lib/cn";
import { debounce } from "@/lib/utils";
import {
  Circle,
  LineSquiggle,
  Minus,
  MoreHorizontal,
  MoveUpRight,
  Square,
} from "lucide-react";
import { useMemo } from "react";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("tools.drawSettings");
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
        <span className="text-sm font-medium w-20">{t("size")}</span>
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
        <span className="text-sm font-medium w-20">{t("opacity")}</span>
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
        <span className="text-sm font-medium w-20">{t("color")}</span>
        <ColorPickerButton
          label={t("drawColor")}
          value={drawSettings.color}
          onChange={debouncedSetColor}
        />
      </div>

      <div className="flex items-center gap-6 p-2">
        <span className="text-sm font-medium w-20">{t("shape")}</span>
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
            <TooltipContent side="bottom">{t("freeDraw")}</TooltipContent>
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
            <TooltipContent side="bottom">
              {t("straightLine")}
            </TooltipContent>
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
            <TooltipContent side="bottom">{t("rectangle")}</TooltipContent>
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
            <TooltipContent side="bottom">{t("ellipse")}</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="flex items-center gap-6 p-2">
        <span className="text-sm font-medium w-20">{t("stroke")}</span>
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
              <TooltipContent side="bottom">{t("solidLine")}</TooltipContent>
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
              <TooltipContent side="bottom">{t("dashedLine")}</TooltipContent>
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
            <TooltipContent side="bottom">{t("arrowHead")}</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="flex items-center gap-6 p-2">
        <span className="text-sm font-medium w-20">
          {t("traversalTime")}
        </span>
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
                      aria-label={t("traversalWeapon", {
                        label:
                          option.value === "knife"
                            ? t("knife")
                            : t("phantomVandal"),
                      })}
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
                    {t("traversalSpeed", {
                      label:
                        option.value === "knife"
                          ? t("knife")
                          : t("phantomVandal"),
                    })}
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
              aria-label={t("traversalMovement")}
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
              {traversalMovement === "run" ? t("run") : t("walk")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
