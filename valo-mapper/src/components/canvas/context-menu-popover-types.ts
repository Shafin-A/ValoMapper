import type {
  CanvasItemInstance,
  ItemType,
} from "@/lib/types";
import type { MutableRefObject, ReactNode } from "react";

export type ContextMenuItemType = ItemType;

export type ContextMenuItem = CanvasItemInstance["item"];

export interface ContextMenuPopoverProps {
  open: boolean;
  x: number;
  y: number;
  itemType: ContextMenuItemType;
  selectedCount: number;
  currentItem: ContextMenuItem | null;
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

export interface ContextMenuSnapshotValues {
  itemType: ContextMenuItemType;
  item: ContextMenuItem | null;
  isAlly: boolean;
  isGray: boolean;
  hasNote: boolean;
  hasAgentDeadToggle: boolean;
  hasSwap: boolean;
  hasIconOnly: boolean;
  hasOuterCircle: boolean;
  hasRemoveAttachedVisionCone: boolean;
  hasDetachVisionCone: boolean;
  abilityIconOnly: boolean;
  abilityShowOuterCircle: boolean;
}

export interface ContextMenuSnapshotHandlers {
  toggleAgentDead: MutableRefObject<(() => void) | undefined>;
  swapAbility: MutableRefObject<(() => void) | undefined>;
  toggleAbilityIconOnly: MutableRefObject<(() => void) | undefined>;
  toggleAbilityOuterCircle: MutableRefObject<(() => void) | undefined>;
  removeAttachedVisionCone: MutableRefObject<(() => void) | undefined>;
  detachVisionCone: MutableRefObject<(() => void) | undefined>;
}

export interface ContextMenuSnapshot {
  allowTooltips: boolean;
  values: ContextMenuSnapshotValues;
  handlers: ContextMenuSnapshotHandlers;
  itemType: ContextMenuItemType;
  item: ContextMenuItem | null;
  isMultiSelection: boolean;
  selectionLabel: string;
  selectionItem: string;
  itemWord: (type: ContextMenuItemType) => string;
}

export interface ContextMenuDesktopProps {
  open: boolean;
  x: number;
  y: number;
  selectedCount: number;
  onOpenChange: (open: boolean) => void;
  onDuplicate: () => void;
  onEditNote?: () => void;
  onToggleAlly?: () => void;
  onDelete: () => void;
  snapshot: ContextMenuSnapshot;
}

export interface ContextMenuMobileSheetProps {
  open: boolean;
  selectedCount: number;
  selectionLabel: string;
  itemType: ContextMenuItemType;
  currentItem: ContextMenuItem | null;
  snapshot: ContextMenuSnapshot;
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

export type ContextMenuMobileAction = {
  key: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  destructive?: boolean;
};
