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
  ToolIconCanvas,
} from "@/lib/types";
import { isVisionConeAction } from "@/lib/vision-cone-utils";
import { isArcAbility, isCircleAbility } from "@/lib/utils";
import { CIRCLE_ABILITY_CONFIGS, ARC_ABILITY_CONFIGS } from "@/lib/consts";
import {
  CircleDashed,
  Copy,
  Cross,
  Eye,
  Heart,
  HeartCrack,
  Minus,
  RefreshCw,
  Shapes,
  Skull,
  Trash2,
} from "lucide-react";
import { Separator } from "../ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEffect, useRef, useState, memo } from "react";

interface ContextMenuPopoverProps {
  open: boolean;
  x: number;
  y: number;
  itemType: "agent" | "ability" | "text" | "image" | "tool";
  selectedCount: number;
  currentItem:
    | AgentCanvas
    | AbilityCanvas
    | TextCanvas
    | ImageCanvas
    | ToolIconCanvas
    | null;
  onOpenChange: (open: boolean) => void;
  onDuplicate: () => void;
  onToggleAlly?: () => void;
  onToggleAgentDead?: () => void;
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
  item:
    | AgentCanvas
    | AbilityCanvas
    | TextCanvas
    | ImageCanvas
    | ToolIconCanvas,
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

export const ContextMenuPopover = memo(function ContextMenuPopover({
  open,
  x,
  y,
  itemType,
  selectedCount,
  currentItem,
  onOpenChange,
  onDuplicate,
  onToggleAlly,
  onToggleAgentDead,
  onSwapAbility,
  onToggleAbilityIconOnly,
  onToggleAbilityOuterCircle,
  onRemoveAttachedVisionCone,
  onDetachVisionCone,
  onDelete,
}: ContextMenuPopoverProps) {
  const isMobile = useIsMobile();
  // Tooltip opens on its own after opening popover for some reason so need to delay it
  const [allowTooltips, setAllowTooltips] = useState(false);

  const snapshotItemType = useRef(itemType);
  const snapshotItem = useRef(currentItem);
  const snapshotIsAlly = useRef(false);
  const snapshotIsGray = useRef(false);
  const snapshotHasAgentDeadToggle = useRef(false);
  const snapshotHasSwap = useRef(false);
  const snapshotHasIconOnly = useRef(false);
  const snapshotHasOuterCircle = useRef(false);
  const snapshotHasRemoveAttachedVisionCone = useRef(false);
  const snapshotHasDetachVisionCone = useRef(false);
  const snapshotAbilityIconOnly = useRef(false);
  const snapshotAbilityShowOuterCircle = useRef(true);

  const onSwapAbilityRef = useRef(onSwapAbility);
  const onToggleAgentDeadRef = useRef(onToggleAgentDead);
  const onToggleAbilityIconOnlyRef = useRef(onToggleAbilityIconOnly);
  const onToggleAbilityOuterCircleRef = useRef(onToggleAbilityOuterCircle);
  const onRemoveAttachedVisionConeRef = useRef(onRemoveAttachedVisionCone);
  const onDetachVisionConeRef = useRef(onDetachVisionCone);

  const pendingSnapshot = useRef({
    itemType,
    currentItem,
    onToggleAgentDead,
    onSwapAbility,
    onToggleAbilityIconOnly,
    onToggleAbilityOuterCircle,
    onRemoveAttachedVisionCone,
    onDetachVisionCone,
  });
  pendingSnapshot.current = {
    itemType,
    currentItem,
    onToggleAgentDead,
    onSwapAbility,
    onToggleAbilityIconOnly,
    onToggleAbilityOuterCircle,
    onRemoveAttachedVisionCone,
    onDetachVisionCone,
  };

  onSwapAbilityRef.current = onSwapAbility;
  onToggleAgentDeadRef.current = onToggleAgentDead;
  onToggleAbilityIconOnlyRef.current = onToggleAbilityIconOnly;
  onToggleAbilityOuterCircleRef.current = onToggleAbilityOuterCircle;
  onRemoveAttachedVisionConeRef.current = onRemoveAttachedVisionCone;
  onDetachVisionConeRef.current = onDetachVisionCone;

  useEffect(() => {
    if (!open) return;

    const {
      itemType,
      currentItem,
      onToggleAgentDead,
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
    snapshotIsGray.current =
      itemType === "agent"
        ? Boolean((currentItem as AgentCanvas | null)?.isGray)
        : false;
    snapshotHasAgentDeadToggle.current =
      itemType === "agent" && Boolean(onToggleAgentDead);
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
  const isMultiSelection = selectedCount > 1;
  const selectionLabel = isMultiSelection
    ? `${selectedCount} Items`
    : itemLabel(snapType);

  const mobileActions: Array<{
    key: string;
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    destructive?: boolean;
  }> = [];

  const abilityItem =
    itemType === "ability" ? (currentItem as AbilityCanvas | null) : null;
  const isIconAbility = abilityItem?.action === "icon";
  const itemIsAlly =
    currentItem && isAllyItem(currentItem, itemType)
      ? currentItem.isAlly
      : false;
  const itemIsGray =
    itemType === "agent" ? Boolean((currentItem as AgentCanvas | null)?.isGray) : false;
  const showOuterCircle = abilityItem?.showOuterCircle ?? true;

  mobileActions.push({
    key: "duplicate",
    label: isMultiSelection
      ? `Duplicate ${selectedCount} items`
      : `Duplicate ${selectionLabel.toLowerCase()}`,
    icon: <Copy className="size-5" />,
    onClick: onDuplicate,
  });

  if (
    onToggleAlly &&
    currentItem &&
    isAllyItem(currentItem, itemType)
  ) {
    mobileActions.push({
      key: "ally",
      label: isMultiSelection
        ? itemIsAlly
          ? "Make all enemy"
          : "Make all ally"
        : itemIsAlly
          ? "Make enemy"
          : "Make ally",
      icon: itemIsAlly ? (
        <HeartCrack className="size-5" />
      ) : (
        <Heart className="size-5" />
      ),
      onClick: onToggleAlly,
    });

  }

  if (onToggleAgentDead && itemType === "agent") {
    mobileActions.push({
      key: "dead",
      label: isMultiSelection
        ? itemIsGray
          ? "Revive agents"
          : "Kill agents"
        : itemIsGray
          ? "Revive agent"
          : "Kill agent",
      icon: itemIsGray ? (
        <Cross className="size-5" />
      ) : (
        <Skull className="size-5" />
      ),
      onClick: onToggleAgentDead,
    });
  }

  if (onSwapAbility) {
    mobileActions.push({
      key: "swap",
      label: isMultiSelection ? "Swap abilities" : "Swap ability",
      icon: <RefreshCw className="size-5" />,
      onClick: onSwapAbility,
    });
  }

  if (onToggleAbilityIconOnly && !isIconAbility) {
    mobileActions.push({
      key: "shapes",
      label: abilityItem?.iconOnly
        ? "Show ability shapes"
        : "Hide ability shapes",
      icon: <Shapes className="size-5" />,
      onClick: onToggleAbilityIconOnly,
    });
  }

  if (onToggleAbilityOuterCircle) {
    mobileActions.push({
      key: "range",
      label: showOuterCircle
        ? "Hide ability range"
        : "Show ability range",
      icon: <CircleDashed className="size-5" />,
      onClick: onToggleAbilityOuterCircle,
    });
  }

  if (onRemoveAttachedVisionCone) {
    mobileActions.push({
      key: "remove-cone",
      label: isMultiSelection ? "Remove vision cones" : "Remove vision cone",
      icon: <Eye className="size-5" />,
      onClick: onRemoveAttachedVisionCone,
    });
  }

  if (onDetachVisionCone) {
    mobileActions.push({
      key: "detach-cone",
      label: isMultiSelection ? "Detach vision cones" : "Detach vision cone",
      icon: <Minus className="size-5" />,
      onClick: onDetachVisionCone,
    });
  }

  mobileActions.push({
    key: "delete",
    label: `Delete ${selectionLabel.toLowerCase()}`,
    icon: <Trash2 className="size-5" />,
    onClick: onDelete,
    destructive: true,
  });

  const handleMobileAction = (action: (typeof mobileActions)[number]) => {
    action.onClick();
    onOpenChange(false);
  };

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="max-h-[80dvh] gap-0 rounded-t-xl pb-[env(safe-area-inset-bottom)]"
        >
          <SheetHeader className="border-b px-4 pb-3 text-left">
            <SheetTitle>{selectionLabel}</SheetTitle>
            <SheetDescription>Choose an action</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-1 overflow-y-auto px-3 py-3">
            {mobileActions.map((action, index) => (
              <div key={action.key}>
                {action.destructive && index > 0 && (
                  <Separator className="my-1" />
                )}
                <Button
                  variant={action.destructive ? "destructiveGhost" : "ghost"}
                  className="h-12 w-full justify-start gap-3 px-3 text-base"
                  onClick={() => handleMobileAction(action)}
                >
                  {action.icon}
                  <span>{action.label}</span>
                </Button>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

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
          onContextMenu={(event) => event.preventDefault()}
        />
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-2"
        side="top"
        align="start"
        onContextMenu={(event) => event.preventDefault()}
      >
        <div className="flex items-center space-x-1">
          <ConditionalTooltip
            enabled={allowTooltips}
            content={`Duplicate ${selectionLabel}`}
          >
            <Button variant="ghost" size="sm" onClick={onDuplicate}>
              <Copy />
            </Button>
          </ConditionalTooltip>

          <Separator
            orientation="vertical"
            className="data-[orientation=vertical]:h-6"
          />

          {onToggleAlly &&
            snapshotItem.current &&
            isAllyItem(snapshotItem.current, snapType) && (
              <>
                <ConditionalTooltip
                  enabled={allowTooltips}
                  content={
                    isMultiSelection
                      ? snapshotIsAlly.current
                        ? "Make All Enemy"
                        : "Make All Ally"
                      : snapshotIsAlly.current
                        ? "Make Enemy"
                        : "Make Ally"
                  }
                >
                  <Button variant="ghost" size="sm" onClick={onToggleAlly}>
                    {snapshotIsAlly.current ? <HeartCrack /> : <Heart />}
                  </Button>
                </ConditionalTooltip>

                <Separator
                  orientation="vertical"
                  className="data-[orientation=vertical]:h-6"
                />

                {snapshotHasAgentDeadToggle.current && (
                  <>
                    <ConditionalTooltip
                      enabled={allowTooltips}
                      content={
                        isMultiSelection
                          ? snapshotIsGray.current
                            ? "Revive All Agents"
                            : "Kill All Agents"
                          : snapshotIsGray.current
                            ? "Revive Agent"
                            : "Kill Agent"
                      }
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onToggleAgentDeadRef.current?.()}
                      >
                        {snapshotIsGray.current ? <Cross /> : <Skull />}
                      </Button>
                    </ConditionalTooltip>

                    <Separator
                      orientation="vertical"
                      className="data-[orientation=vertical]:h-6"
                    />
                  </>
                )}
              </>
            )}

          {snapshotHasSwap.current && (
            <>
              <ConditionalTooltip
                enabled={allowTooltips}
                content={isMultiSelection ? "Swap All Abilities" : "Swap Ability"}
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
                  isMultiSelection
                    ? snapshotAbilityIconOnly.current
                      ? "Show All Ability Shapes"
                      : "Hide All Ability Shapes"
                    : snapshotAbilityIconOnly.current
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
                  isMultiSelection
                    ? snapshotAbilityShowOuterCircle.current
                      ? "Hide All Ranges"
                      : "Show All Ranges"
                    : snapshotAbilityShowOuterCircle.current
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
                content={
                  isMultiSelection ? "Remove Vision Cones" : "Remove Vision Cone"
                }
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
                content={
                  isMultiSelection ? "Detach Vision Cones" : "Detach Vision Cone"
                }
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
            content={`Delete ${selectionLabel}`}
          >
            <Button variant="destructiveGhost" size="sm" onClick={onDelete}>
              <Trash2 />
            </Button>
          </ConditionalTooltip>
        </div>
      </PopoverContent>
    </Popover>
  );
});
