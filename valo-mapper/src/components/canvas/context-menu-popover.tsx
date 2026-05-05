import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AbilityCanvas,
  AgentCanvas,
  ImageCanvas,
  TextCanvas,
} from "@/lib/types";
import { isVisionConeAction } from "@/lib/vision-cone-utils";
import { isArcAbility, isCircleAbility } from "@/lib/utils";
import { CIRCLE_ABILITY_CONFIGS, ARC_ABILITY_CONFIGS } from "@/lib/consts";
import {
  CircleDashed,
  Copy,
  Eye,
  Heart,
  HeartCrack,
  Minus,
  RefreshCw,
  Shapes,
  Trash2,
} from "lucide-react";
import { Separator } from "../ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { useEffect, useRef, useState } from "react";

interface ContextMenuPopoverProps {
  open: boolean;
  x: number;
  y: number;
  itemType: "agent" | "ability" | "text" | "image" | "tool";
  currentItem: AgentCanvas | AbilityCanvas | TextCanvas | ImageCanvas | null;
  onOpenChange: (open: boolean) => void;
  onDuplicate: () => void;
  onToggleAlly: () => void;
  onSwapAbility?: () => void;
  onToggleAbilityIconOnly?: () => void;
  onToggleAbilityOuterCircle?: () => void;
  onRemoveAttachedVisionCone?: () => void;
  onDetachVisionCone?: () => void;
  onDelete: () => void;
}

const itemLabel = (itemType: ContextMenuPopoverProps["itemType"]): string => {
  switch (itemType) {
    case "agent":
      return "Agent";
    case "ability":
      return "Ability";
    case "image":
      return "Image";
    case "tool":
      return "Icon";
    default:
      return "Text";
  }
};

const isAllyItem = (
  item: AgentCanvas | AbilityCanvas | TextCanvas | ImageCanvas,
  itemType: ContextMenuPopoverProps["itemType"],
): item is AgentCanvas | AbilityCanvas => {
  return itemType !== "text" && itemType !== "image" && itemType !== "tool";
};

const ConditionalTooltip = ({
  children,
  content,
  enabled,
}: {
  children: React.ReactNode;
  content: string;
  enabled: boolean;
}) =>
  enabled ? (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top">{content}</TooltipContent>
    </Tooltip>
  ) : (
    <>{children}</>
  );

export const ContextMenuPopover = ({
  open,
  x,
  y,
  itemType,
  currentItem,
  onOpenChange,
  onDuplicate,
  onToggleAlly,
  onSwapAbility,
  onToggleAbilityIconOnly,
  onToggleAbilityOuterCircle,
  onRemoveAttachedVisionCone,
  onDetachVisionCone,
  onDelete,
}: ContextMenuPopoverProps) => {
  // Tooltip opens on its own after opening popover for some reason so need to delay it
  const [allowTooltips, setAllowTooltips] = useState(false);

  const snapshotItemType = useRef(itemType);
  const snapshotItem = useRef(currentItem);
  const snapshotIsAlly = useRef(false);
  const snapshotHasSwap = useRef(false);
  const snapshotHasIconOnly = useRef(false);
  const snapshotHasOuterCircle = useRef(false);
  const snapshotHasRemoveAttachedVisionCone = useRef(false);
  const snapshotHasDetachVisionCone = useRef(false);
  const snapshotAbilityIconOnly = useRef(false);
  const snapshotAbilityShowOuterCircle = useRef(true);

  const onSwapAbilityRef = useRef(onSwapAbility);
  const onToggleAbilityIconOnlyRef = useRef(onToggleAbilityIconOnly);
  const onToggleAbilityOuterCircleRef = useRef(onToggleAbilityOuterCircle);
  const onRemoveAttachedVisionConeRef = useRef(onRemoveAttachedVisionCone);
  const onDetachVisionConeRef = useRef(onDetachVisionCone);

  const pendingSnapshot = useRef({
    itemType,
    currentItem,
    onSwapAbility,
    onToggleAbilityIconOnly,
    onToggleAbilityOuterCircle,
    onRemoveAttachedVisionCone,
    onDetachVisionCone,
  });
  pendingSnapshot.current = {
    itemType,
    currentItem,
    onSwapAbility,
    onToggleAbilityIconOnly,
    onToggleAbilityOuterCircle,
    onRemoveAttachedVisionCone,
    onDetachVisionCone,
  };

  onSwapAbilityRef.current = onSwapAbility;
  onToggleAbilityIconOnlyRef.current = onToggleAbilityIconOnly;
  onToggleAbilityOuterCircleRef.current = onToggleAbilityOuterCircle;
  onRemoveAttachedVisionConeRef.current = onRemoveAttachedVisionCone;
  onDetachVisionConeRef.current = onDetachVisionCone;

  useEffect(() => {
    if (!open) return;

    const {
      itemType,
      currentItem,
      onSwapAbility,
      onToggleAbilityIconOnly,
      onToggleAbilityOuterCircle,
      onRemoveAttachedVisionCone,
      onDetachVisionCone,
    } = pendingSnapshot.current;

    const abilityItem =
      itemType === "ability" ? (currentItem as AbilityCanvas) : null;

    const currentAbilityAction = abilityItem?.action;
    const isIconAbility = currentAbilityAction === "icon";

    const currentCircleConfig =
      currentAbilityAction && isCircleAbility(currentAbilityAction)
        ? CIRCLE_ABILITY_CONFIGS[
            currentAbilityAction as keyof typeof CIRCLE_ABILITY_CONFIGS
          ]
        : undefined;

    const currentArcConfig =
      currentAbilityAction && isArcAbility(currentAbilityAction)
        ? ARC_ABILITY_CONFIGS[
            currentAbilityAction as keyof typeof ARC_ABILITY_CONFIGS
          ]
        : undefined;

    const abilityHasOuterCircle = Boolean(
      currentCircleConfig?.activeRadius || currentArcConfig?.outerCircleRadius,
    );

    snapshotItemType.current = itemType;
    snapshotItem.current = currentItem;
    snapshotIsAlly.current =
      currentItem && isAllyItem(currentItem, itemType)
        ? currentItem.isAlly
        : false;
    snapshotHasSwap.current = Boolean(onSwapAbility);
    snapshotHasIconOnly.current =
      Boolean(onToggleAbilityIconOnly) && !isIconAbility;
    snapshotHasOuterCircle.current =
      abilityHasOuterCircle && Boolean(onToggleAbilityOuterCircle);
    snapshotHasRemoveAttachedVisionCone.current = Boolean(
      onRemoveAttachedVisionCone,
    );
    snapshotHasDetachVisionCone.current =
      Boolean(onDetachVisionCone) &&
      Boolean(abilityItem?.attachedToId) &&
      Boolean(currentAbilityAction && isVisionConeAction(currentAbilityAction));
    snapshotAbilityIconOnly.current = abilityItem?.iconOnly ?? false;
    snapshotAbilityShowOuterCircle.current = abilityHasOuterCircle
      ? (abilityItem?.showOuterCircle ?? true)
      : true;

    setAllowTooltips(false);
    const timer = setTimeout(() => setAllowTooltips(true), 300);
    return () => clearTimeout(timer);
  }, [open]);

  const snapType = snapshotItemType.current;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <div
          style={{
            position: "fixed",
            left: x,
            top: y,
            width: 1,
            height: 1,
            pointerEvents: "none",
          }}
        />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" side="top" align="start">
        <div className="flex items-center space-x-1">
          <ConditionalTooltip
            enabled={allowTooltips}
            content={`Duplicate ${itemLabel(snapType)}`}
          >
            <Button variant="ghost" size="sm" onClick={onDuplicate}>
              <Copy />
            </Button>
          </ConditionalTooltip>

          <Separator
            orientation="vertical"
            className="data-[orientation=vertical]:h-6"
          />

          {snapshotItem.current &&
            isAllyItem(snapshotItem.current, snapType) && (
              <>
                <ConditionalTooltip
                  enabled={allowTooltips}
                  content={snapshotIsAlly.current ? "Make Enemy" : "Make Ally"}
                >
                  <Button variant="ghost" size="sm" onClick={onToggleAlly}>
                    {snapshotIsAlly.current ? <HeartCrack /> : <Heart />}
                  </Button>
                </ConditionalTooltip>

                <Separator
                  orientation="vertical"
                  className="data-[orientation=vertical]:h-6"
                />
              </>
            )}

          {snapshotHasSwap.current && (
            <>
              <ConditionalTooltip
                enabled={allowTooltips}
                content="Swap Ability"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSwapAbilityRef.current?.()}
                >
                  <RefreshCw />
                </Button>
              </ConditionalTooltip>

              <Separator
                orientation="vertical"
                className="data-[orientation=vertical]:h-6"
              />
            </>
          )}

          {snapshotHasIconOnly.current && (
            <>
              <ConditionalTooltip
                enabled={allowTooltips}
                content={
                  snapshotAbilityIconOnly.current
                    ? "Show Ability Shapes"
                    : "Hide Ability Shapes"
                }
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleAbilityIconOnlyRef.current?.()}
                >
                  <span className="relative inline-flex items-center justify-center w-4 h-4 overflow-visible">
                    <Shapes className="w-4 h-4" />
                    {!snapshotAbilityIconOnly.current && (
                      <Minus className="absolute rotate-135 text-destructive size-8" />
                    )}
                  </span>
                </Button>
              </ConditionalTooltip>

              <Separator
                orientation="vertical"
                className="data-[orientation=vertical]:h-6"
              />
            </>
          )}

          {snapshotHasOuterCircle.current && (
            <>
              <ConditionalTooltip
                enabled={allowTooltips}
                content={
                  snapshotAbilityShowOuterCircle.current
                    ? "Hide Range"
                    : "Show Range"
                }
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleAbilityOuterCircleRef.current?.()}
                >
                  <span className="relative inline-flex items-center justify-center size-4 overflow-visible">
                    <CircleDashed className="size-4" />
                    {snapshotAbilityShowOuterCircle.current && (
                      <Minus className="absolute rotate-135 text-destructive size-8" />
                    )}
                  </span>
                </Button>
              </ConditionalTooltip>

              <Separator
                orientation="vertical"
                className="data-[orientation=vertical]:h-6"
              />
            </>
          )}

          {snapshotHasRemoveAttachedVisionCone.current && (
            <>
              <ConditionalTooltip
                enabled={allowTooltips}
                content="Remove Vision Cone"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveAttachedVisionConeRef.current?.()}
                >
                  <span className="relative inline-flex items-center justify-center size-4 overflow-visible">
                    <Eye className="size-4" />
                    <Minus className="absolute rotate-135 text-destructive size-8" />
                  </span>
                </Button>
              </ConditionalTooltip>

              <Separator
                orientation="vertical"
                className="data-[orientation=vertical]:h-6"
              />
            </>
          )}

          {snapshotHasDetachVisionCone.current && (
            <>
              <ConditionalTooltip
                enabled={allowTooltips}
                content="Detach Vision Cone"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDetachVisionConeRef.current?.()}
                >
                  <Minus />
                </Button>
              </ConditionalTooltip>

              <Separator
                orientation="vertical"
                className="data-[orientation=vertical]:h-6"
              />
            </>
          )}

          <ConditionalTooltip
            enabled={allowTooltips}
            content={`Delete ${itemLabel(snapType)}`}
          >
            <Button variant="destructiveGhost" size="sm" onClick={onDelete}>
              <Trash2 />
            </Button>
          </ConditionalTooltip>
        </div>
      </PopoverContent>
    </Popover>
  );
};
