import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
import type { ContextMenuDesktopProps } from "./context-menu-popover-types";

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

export const ContextMenuDesktop = ({
  open,
  x,
  y,
  selectedCount,
  onOpenChange,
  onDuplicate,
  onEditNote,
  onToggleAlly,
  onDelete,
  snapshot,
}: ContextMenuDesktopProps) => {
  const t = useTranslations("canvas.contextMenu");
  const {
    allowTooltips,
    values,
    handlers,
    itemType: snapType,
    isMultiSelection,
    selectionItem,
  } = snapshot;

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
                content={values.hasNote ? t("editNote") : t("addNote")}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={values.hasNote ? t("editNote") : t("addNote")}
                  onClick={onEditNote}
                >
                  {values.hasNote ? (
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
            values.item &&
            isAllyItem(values.item, snapType) && (
              <>
                <ConditionalTooltip
                  enabled={allowTooltips}
                  content={
                    isMultiSelection
                      ? values.isAlly
                        ? t("makeAllEnemy")
                        : t("makeAllAlly")
                      : values.isAlly
                        ? t("makeEnemy")
                        : t("makeAlly")
                  }
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={
                      isMultiSelection
                        ? values.isAlly
                          ? t("makeAllEnemy")
                          : t("makeAllAlly")
                        : values.isAlly
                          ? t("makeEnemy")
                          : t("makeAlly")
                    }
                    onClick={onToggleAlly}
                  >
                    {values.isAlly ? <HeartCrack /> : <Heart />}
                  </Button>
                </ConditionalTooltip>

                <Separator
                  orientation="vertical"
                  className="data-[orientation=vertical]:h-6"
                />

                {values.hasAgentDeadToggle && (
                  <>
                    <ConditionalTooltip
                      enabled={allowTooltips}
                      content={
                        isMultiSelection
                          ? values.isGray
                            ? t("reviveAgents")
                            : t("killAgents")
                          : values.isGray
                            ? t("reviveAgent")
                            : t("killAgent")
                      }
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={
                          isMultiSelection
                            ? values.isGray
                              ? t("reviveAgents")
                              : t("killAgents")
                            : values.isGray
                              ? t("reviveAgent")
                              : t("killAgent")
                        }
                        onClick={() => handlers.toggleAgentDead.current?.()}
                      >
                        {values.isGray ? <Cross /> : <Skull />}
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

          {values.hasSwap && (
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
                  onClick={() => handlers.swapAbility.current?.()}
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

          {values.hasIconOnly && (
            <>
              <ConditionalTooltip
                enabled={allowTooltips}
                content={
                  values.abilityIconOnly
                    ? t("showAbilityShapes")
                    : t("hideAbilityShapes")
                }
              >
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={
                    values.abilityIconOnly
                      ? t("showAbilityShapes")
                      : t("hideAbilityShapes")
                  }
                  onClick={() => handlers.toggleAbilityIconOnly.current?.()}
                >
                  <span className="relative inline-flex items-center justify-center w-4 h-4 overflow-visible">
                    <Shapes className="w-4 h-4" />
                    {!values.abilityIconOnly && (
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

          {values.hasOuterCircle && (
            <>
              <ConditionalTooltip
                enabled={allowTooltips}
                content={
                  values.abilityShowOuterCircle
                    ? t("hideAbilityRange")
                    : t("showAbilityRange")
                }
              >
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={
                    values.abilityShowOuterCircle
                      ? t("hideAbilityRange")
                      : t("showAbilityRange")
                  }
                  onClick={() =>
                    handlers.toggleAbilityOuterCircle.current?.()
                  }
                >
                  <span className="relative inline-flex items-center justify-center size-4 overflow-visible">
                    <CircleDashed className="size-4" />
                    {values.abilityShowOuterCircle && (
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

          {values.hasRemoveAttachedVisionCone && (
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
                  onClick={() =>
                    handlers.removeAttachedVisionCone.current?.()
                  }
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

          {values.hasDetachVisionCone && (
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
                  onClick={() => handlers.detachVisionCone.current?.()}
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
};
