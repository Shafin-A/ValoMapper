import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
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
import { useTranslations } from "next-intl";
import { isAllyItem } from "@/lib/canvas-selection";
import type {
  AbilityCanvas,
  AgentCanvas,
} from "@/lib/types";
import type {
  ContextMenuMobileAction,
  ContextMenuMobileSheetProps,
} from "./context-menu-popover-types";

export const ContextMenuMobileSheet = ({
  open,
  selectedCount,
  selectionLabel,
  itemType,
  currentItem,
  snapshot,
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
}: ContextMenuMobileSheetProps) => {
  const t = useTranslations("canvas.contextMenu");
  const { isMultiSelection, itemType: snapType, itemWord } = snapshot;

  const mobileActions: ContextMenuMobileAction[] = [];

  const abilityItem =
    itemType === "ability" ? (currentItem as AbilityCanvas | null) : null;
  const isIconAbility = abilityItem?.action === "icon";
  const itemIsAlly =
    currentItem && isAllyItem(currentItem, itemType)
      ? currentItem.isAlly
      : false;
  const itemIsGray =
    itemType === "agent"
      ? Boolean((currentItem as AgentCanvas | null)?.isGray)
      : false;
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

  if (onToggleAlly && currentItem && isAllyItem(currentItem, itemType)) {
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

  const handleMobileAction = (action: ContextMenuMobileAction) => {
    action.onClick();
    onOpenChange(false);
  };

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
              {action.destructive && index > 0 && <Separator className="my-1" />}
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
};
