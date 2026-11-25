import { useIsMobile } from "@/hooks/use-mobile";
import { memo } from "react";
import { ContextMenuDesktop } from "./context-menu-desktop";
import { ContextMenuMobileSheet } from "./context-menu-mobile-sheet";
import type { ContextMenuPopoverProps } from "./context-menu-popover-types";
import { useContextMenuSnapshot } from "./use-context-menu-snapshot";

export const ContextMenuPopover = memo(function ContextMenuPopover(
  props: ContextMenuPopoverProps,
) {
  const isMobile = useIsMobile();
  const snapshot = useContextMenuSnapshot(props);

  if (isMobile) {
    return (
      <ContextMenuMobileSheet
        {...props}
        snapshot={snapshot}
        selectionLabel={snapshot.selectionLabel}
      />
    );
  }

  return (
    <ContextMenuDesktop
      open={props.open}
      x={props.x}
      y={props.y}
      selectedCount={props.selectedCount}
      onOpenChange={props.onOpenChange}
      onDuplicate={props.onDuplicate}
      onEditNote={props.onEditNote}
      onToggleAlly={props.onToggleAlly}
      onDelete={props.onDelete}
      snapshot={snapshot}
    />
  );
});
