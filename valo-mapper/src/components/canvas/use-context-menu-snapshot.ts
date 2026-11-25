import { ARC_ABILITY_CONFIGS, CIRCLE_ABILITY_CONFIGS } from "@/lib/consts";
import type { AbilityCanvas, AgentCanvas } from "@/lib/types";
import { isArcAbility, isCircleAbility } from "@/lib/utils";
import { isVisionConeAction } from "@/lib/vision-cone-utils";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { isAllyItem } from "@/lib/canvas-selection";
import type {
  ContextMenuItemType,
  ContextMenuPopoverProps,
  ContextMenuSnapshot,
  ContextMenuSnapshotHandlers,
  ContextMenuSnapshotValues,
} from "./context-menu-popover-types";

export const useContextMenuSnapshot = ({
  open,
  itemType,
  selectedCount,
  currentItem,
  onEditNote,
  onToggleAgentDead,
  onSwapAbility,
  onToggleAbilityIconOnly,
  onToggleAbilityOuterCircle,
  onRemoveAttachedVisionCone,
  onDetachVisionCone,
}: Pick<
  ContextMenuPopoverProps,
  | "open"
  | "itemType"
  | "selectedCount"
  | "currentItem"
  | "onEditNote"
  | "onToggleAgentDead"
  | "onSwapAbility"
  | "onToggleAbilityIconOnly"
  | "onToggleAbilityOuterCircle"
  | "onRemoveAttachedVisionCone"
  | "onDetachVisionCone"
>): ContextMenuSnapshot => {
  const t = useTranslations("canvas.contextMenu");

  const itemLabel = (type: ContextMenuItemType): string => {
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

  const itemWord = (type: ContextMenuItemType): string => {
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

  const values = useRef<ContextMenuSnapshotValues>({
    itemType,
    item: currentItem,
    isAlly: false,
    isGray: false,
    hasNote: false,
    hasAgentDeadToggle: false,
    hasSwap: false,
    hasIconOnly: false,
    hasOuterCircle: false,
    hasRemoveAttachedVisionCone: false,
    hasDetachVisionCone: false,
    abilityIconOnly: false,
    abilityShowOuterCircle: true,
  });

  const handlers = useRef<ContextMenuSnapshotHandlers>({
    toggleAgentDead: { current: onToggleAgentDead },
    swapAbility: { current: onSwapAbility },
    toggleAbilityIconOnly: { current: onToggleAbilityIconOnly },
    toggleAbilityOuterCircle: { current: onToggleAbilityOuterCircle },
    removeAttachedVisionCone: { current: onRemoveAttachedVisionCone },
    detachVisionCone: { current: onDetachVisionCone },
  });

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

  handlers.current.toggleAgentDead.current = onToggleAgentDead;
  handlers.current.swapAbility.current = onSwapAbility;
  handlers.current.toggleAbilityIconOnly.current = onToggleAbilityIconOnly;
  handlers.current.toggleAbilityOuterCircle.current = onToggleAbilityOuterCircle;
  handlers.current.removeAttachedVisionCone.current =
    onRemoveAttachedVisionCone;
  handlers.current.detachVisionCone.current = onDetachVisionCone;

  useEffect(() => {
    if (!open) return;

    const {
      itemType: pendingItemType,
      currentItem: pendingItem,
      onEditNote: pendingEditNote,
      onToggleAgentDead: pendingToggleAgentDead,
      onSwapAbility: pendingSwapAbility,
      onToggleAbilityIconOnly: pendingToggleAbilityIconOnly,
      onToggleAbilityOuterCircle: pendingToggleAbilityOuterCircle,
      onRemoveAttachedVisionCone: pendingRemoveAttachedVisionCone,
      onDetachVisionCone: pendingDetachVisionCone,
    } = pendingSnapshot.current;

    const abilityItem =
      pendingItemType === "ability"
        ? (pendingItem as AbilityCanvas)
        : null;

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

    const next: ContextMenuSnapshotValues = {
      itemType: pendingItemType,
      item: pendingItem,
      isAlly:
        pendingItem && isAllyItem(pendingItem, pendingItemType)
          ? pendingItem.isAlly
          : false,
      isGray:
        pendingItemType === "agent"
          ? Boolean((pendingItem as AgentCanvas | null)?.isGray)
          : false,
      hasNote:
        Boolean(pendingEditNote) && Boolean(pendingItem?.note?.trim()),
      hasAgentDeadToggle:
        pendingItemType === "agent" && Boolean(pendingToggleAgentDead),
      hasSwap: Boolean(pendingSwapAbility),
      hasIconOnly:
        Boolean(pendingToggleAbilityIconOnly) && !isIconAbility,
      hasOuterCircle:
        abilityHasOuterCircle && Boolean(pendingToggleAbilityOuterCircle),
      hasRemoveAttachedVisionCone: Boolean(pendingRemoveAttachedVisionCone),
      hasDetachVisionCone:
        Boolean(pendingDetachVisionCone) &&
        Boolean(abilityItem?.attachedToId) &&
        Boolean(
          currentAbilityAction && isVisionConeAction(currentAbilityAction),
        ),
      abilityIconOnly: abilityItem?.iconOnly ?? false,
      abilityShowOuterCircle: abilityHasOuterCircle
        ? (abilityItem?.showOuterCircle ?? true)
        : true,
    };

    values.current = next;

    setAllowTooltips(false);
    const timer = setTimeout(() => setAllowTooltips(true), 300);
    return () => clearTimeout(timer);
  }, [open]);

  const isMultiSelection = selectedCount > 1;
  const selectionLabel = isMultiSelection
    ? t("itemsCount", { count: selectedCount })
    : itemLabel(values.current.itemType);
  const selectionItem = itemWord(values.current.itemType);

  return {
    allowTooltips,
    values: values.current,
    handlers: handlers.current,
    itemType: values.current.itemType,
    item: values.current.item,
    isMultiSelection,
    selectionLabel,
    selectionItem,
    itemWord,
  };
};
