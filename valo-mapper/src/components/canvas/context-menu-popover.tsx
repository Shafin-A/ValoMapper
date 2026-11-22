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
  MessageSquare,
  MessageSquarePlus,
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
import { useTranslations } from "next-intl";
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
  onEditNote?: () => void;
  onToggleAlly?: () => void;
  onToggleAgentDead?: () => void;
  onSwapAbility?: () => void;
  onToggleAbilityIconOnly?: () => void;
  onToggleAbilityOuterCircle?: () => void;
  onRemoveAttachedVisionCone?: () => void;
  onDetachVisionCone?: () => void;
  onDelete: () => void;
}

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
  onEditNote,
  onToggleAlly,
  onToggleAgentDead,
  onSwapAbility,
  onToggleAbilityIconOnly,
  onToggleAbilityOuterCircle,
  onRemoveAttachedVisionCone,
  onDetachVisionCone,
  onDelete,
}: ContextMenuPopoverProps) {
  const t = useTranslations("canvas.contextMenu");
  const isMobile = useIsMobile();
  const itemLabel = (type: ContextMenuPopoverProps["itemType"]): string => {
    switch (type) {
      case "agent":
        return t("itemTypes.agent");
      case "ability":
        return t("itemTypes.ability");
      case "image":
        return t("itemTypes.image");
      case "tool":
        return t("itemTypes.icon");
      default:
        return t("itemTypes.text");
    }
  };
  const itemWord = (type: ContextMenuPopoverProps["itemType"]): string => {
    switch (type) {
      case "agent":
        return t("items.agent");
      case "ability":
        return t("items.ability");
      case "image":
        return t("items.image");
      case "tool":
        return t("items.icon");
      default:
        return t("items.text");
    }
  };
  // Tooltips auto-open when the popover mounts; delay enabling them.
  const [allowTooltips, setAllowTooltips] = useState(false);

  const snapshotItemType = useRef(itemType);
  const snapshotItem = useRef(currentItem);
  const snapshotIsAlly = useRef(false);
  const snapshotIsGray = useRef(false);
  const snapshotHasNote = useRef(false);
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
    onEditNote,
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
    onEditNote,
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
      onEditNote,
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
    snapshotHasNote.current =
      Boolean(onEditNote) && Boolean(currentItem?.note?.trim());
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
    ? t("itemsCount", { count: selectedCount })
    : itemLabel(snapType);
  const selectionItem = itemWord(snapType);

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
      ? t("duplicateItems", { count: selectedCount })
      : t("duplicateItem", { item: itemWord(snapType) }),
    icon: <Copy className="size-5" />,
    onClick: onDuplicate,
  });

  if (onEditNote) {
    mobileActions.push({
      key: "note",
      label: currentItem?.note?.trim() ? t("editNote") : t("addNote"),
      icon: currentItem?.note?.trim() ? (
        <MessageSquare className="size-5" />
      ) : (
        <MessageSquarePlus className="size-5" />
      ),
      onClick: onEditNote,
    });
  }

  if (
    onToggleAlly &&
    currentItem &&
    isAllyItem(currentItem, itemType)
  ) {
    mobileActions.push({
      key: "ally",
      label: isMultiSelection
        ? itemIsAlly
          ? t("makeAllEnemy")
          : t("makeAllAlly")
        : itemIsAlly
          ? t("makeEnemy")
          : t("makeAlly"),
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
          ? t("reviveAgents")
          : t("killAgents")
        : itemIsGray
          ? t("reviveAgent")
          : t("killAgent"),
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
      label: isMultiSelection ? t("swapAbilities") : t("swapAbility"),
      icon: <RefreshCw className="size-5" />,
      onClick: onSwapAbility,
    });
  }

  if (onToggleAbilityIconOnly && !isIconAbility) {
    mobileActions.push({
      key: "shapes",
      label: abilityItem?.iconOnly
        ? t("showAbilityShapes")
        : t("hideAbilityShapes"),
      icon: <Shapes className="size-5" />,
      onClick: onToggleAbilityIconOnly,
    });
  }

  if (onToggleAbilityOuterCircle) {
    mobileActions.push({
      key: "range",
      label: showOuterCircle ? t("hideAbilityRange") : t("showAbilityRange"),
      icon: <CircleDashed className="size-5" />,
      onClick: onToggleAbilityOuterCircle,
    });
  }

  if (onRemoveAttachedVisionCone) {
    mobileActions.push({
      key: "remove-cone",
      label: isMultiSelection ? t("removeVisionCones") : t("removeVisionCone"),
      icon: <Eye className="size-5" />,
      onClick: onRemoveAttachedVisionCone,
    });
  }

  if (onDetachVisionCone) {
    mobileActions.push({
      key: "detach-cone",
      label: isMultiSelection ? t("detachVisionCones") : t("detachVisionCone"),
      icon: <Minus className="size-5" />,
      onClick: onDetachVisionCone,
    });
  }

  mobileActions.push({
    key: "delete",
    label: isMultiSelection
      ? t("deleteItems", { count: selectedCount })
      : t("deleteItem", { item: itemWord(snapType) }),
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
          <SheetHeader className="border-b px-4 pb-3 text-start">
            <SheetTitle>{selectionLabel}</SheetTitle>
            <SheetDescription>{t("chooseAction")}</SheetDescription>
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
        <div className="flex items-center gap-1">
          <ConditionalTooltip
            enabled={allowTooltips}
            content={
              isMultiSelection
                ? t("duplicateItems", { count: selectedCount })
                : t("duplicateItem", { item: selectionItem })
            }
          >
            <Button
              variant="ghost"
              size="sm"
              aria-label={
                isMultiSelection
                  ? t("duplicateItems", { count: selectedCount })
                  : t("duplicateItem", { item: selectionItem })
              }
              onClick={onDuplicate}
            >
              <Copy />
            </Button>
          </ConditionalTooltip>

          <Separator
            orientation="vertical"
            className="data-[orientation=vertical]:h-6"
          />

          {onEditNote && (
            <>
              <ConditionalTooltip
                enabled={allowTooltips}
                content={
                  snapshotHasNote.current ? t("editNote") : t("addNote")
                }
              >
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={
                    snapshotHasNote.current ? t("editNote") : t("addNote")
                  }
                  onClick={onEditNote}
                >
                  {snapshotHasNote.current ? (
                    <MessageSquare />
                  ) : (
                    <MessageSquarePlus />
                  )}
                </Button>
              </ConditionalTooltip>

              <Separator
                orientation="vertical"
                className="data-[orientation=vertical]:h-6"
              />
            </>
          )}

          {onToggleAlly &&
            snapshotItem.current &&
            isAllyItem(snapshotItem.current, snapType) && (
              <>
                <ConditionalTooltip
                  enabled={allowTooltips}
                  content={
                    isMultiSelection
                      ? snapshotIsAlly.current
                        ? t("makeAllEnemy")
                        : t("makeAllAlly")
                      : snapshotIsAlly.current
                        ? t("makeEnemy")
                        : t("makeAlly")
                  }
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={
                      isMultiSelection
                        ? snapshotIsAlly.current
                          ? t("makeAllEnemy")
                          : t("makeAllAlly")
                        : snapshotIsAlly.current
                          ? t("makeEnemy")
                          : t("makeAlly")
                    }
                    onClick={onToggleAlly}
                  >
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
                            ? t("reviveAgents")
                            : t("killAgents")
                          : snapshotIsGray.current
                            ? t("reviveAgent")
                            : t("killAgent")
                      }
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={
                          isMultiSelection
                            ? snapshotIsGray.current
                              ? t("reviveAgents")
                              : t("killAgents")
                            : snapshotIsGray.current
                              ? t("reviveAgent")
                              : t("killAgent")
                        }
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
                content={
                  isMultiSelection ? t("swapAbilities") : t("swapAbility")
                }
              >
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={
                    isMultiSelection ? t("swapAbilities") : t("swapAbility")
                  }
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
                      ? t("showAbilityShapes")
                      : t("hideAbilityShapes")
                    : snapshotAbilityIconOnly.current
                      ? t("showAbilityShapes")
                      : t("hideAbilityShapes")
                }
              >
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={
                    isMultiSelection
                      ? snapshotAbilityIconOnly.current
                        ? t("showAbilityShapes")
                        : t("hideAbilityShapes")
                      : snapshotAbilityIconOnly.current
                        ? t("showAbilityShapes")
                        : t("hideAbilityShapes")
                  }
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
                      ? t("hideAbilityRange")
                      : t("showAbilityRange")
                    : snapshotAbilityShowOuterCircle.current
                      ? t("hideAbilityRange")
                      : t("showAbilityRange")
                }
              >
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={
                    isMultiSelection
                      ? snapshotAbilityShowOuterCircle.current
                        ? t("hideAbilityRange")
                        : t("showAbilityRange")
                      : snapshotAbilityShowOuterCircle.current
                        ? t("hideAbilityRange")
                        : t("showAbilityRange")
                  }
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
                  isMultiSelection ? t("removeVisionCones") : t("removeVisionCone")
                }
              >
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={
                    isMultiSelection
                      ? t("removeVisionCones")
                      : t("removeVisionCone")
                  }
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
                  isMultiSelection ? t("detachVisionCones") : t("detachVisionCone")
                }
              >
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={
                    isMultiSelection
                      ? t("detachVisionCones")
                      : t("detachVisionCone")
                  }
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
            content={
              isMultiSelection
                ? t("deleteItems", { count: selectedCount })
                : t("deleteItem", { item: selectionItem })
            }
          >
            <Button
              variant="destructiveGhost"
              size="sm"
              aria-label={
                isMultiSelection
                  ? t("deleteItems", { count: selectedCount })
                  : t("deleteItem", { item: selectionItem })
              }
              onClick={onDelete}
            >
              <Trash2 />
            </Button>
          </ConditionalTooltip>
        </div>
      </PopoverContent>
    </Popover>
  );
});
