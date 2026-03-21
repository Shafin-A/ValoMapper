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
import {
  Copy,
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
  onDelete: () => void;
}

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
  onDelete,
}: ContextMenuPopoverProps) => {
  const [allowTooltips, setAllowTooltips] = useState(false);
  const [initialIsAlly, setInitialIsAlly] = useState(false);
  const swapAbilityRef = useRef(onSwapAbility);
  const abilityIconOnly =
    itemType === "ability"
      ? (currentItem as AbilityCanvas | null)?.iconOnly
      : false;

  useEffect(() => {
    if (open) {
      swapAbilityRef.current = onSwapAbility;
      if (itemType !== "text" && itemType !== "image" && currentItem) {
        setInitialIsAlly((currentItem as AgentCanvas | AbilityCanvas).isAlly);
      }
      setAllowTooltips(false); // Tooltip opens on its own after opening popover for some reason so need to delay it
      const timer = setTimeout(() => setAllowTooltips(true), 300);
      return () => clearTimeout(timer);
    }
  }, [currentItem, itemType, onSwapAbility, open]);

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
            content={`Duplicate ${
              itemType === "agent"
                ? "Agent"
                : itemType === "ability"
                  ? "Ability"
                  : itemType === "image"
                    ? "Image"
                    : itemType === "tool"
                      ? "Icon"
                      : "Text"
            }`}
          >
            <Button variant="ghost" size="sm" onClick={onDuplicate}>
              <Copy />
            </Button>
          </ConditionalTooltip>

          <Separator
            orientation="vertical"
            className="data-[orientation=vertical]:h-6"
          />

          {itemType !== "text" &&
            itemType !== "image" &&
            itemType !== "tool" && (
              <>
                <ConditionalTooltip
                  enabled={allowTooltips}
                  content={initialIsAlly ? "Make Enemy" : "Make Ally"}
                >
                  <Button variant="ghost" size="sm" onClick={onToggleAlly}>
                    {initialIsAlly ? <HeartCrack /> : <Heart />}
                  </Button>
                </ConditionalTooltip>

                <Separator
                  orientation="vertical"
                  className="data-[orientation=vertical]:h-6"
                />
              </>
            )}

          {swapAbilityRef.current && (
            <>
              <ConditionalTooltip
                enabled={allowTooltips}
                content="Swap Ability"
              >
                <Button variant="ghost" size="sm" onClick={onSwapAbility}>
                  <RefreshCw />
                </Button>
              </ConditionalTooltip>

              <Separator
                orientation="vertical"
                className="data-[orientation=vertical]:h-6"
              />
            </>
          )}

          {onToggleAbilityIconOnly && itemType === "ability" && (
            <>
              <ConditionalTooltip
                enabled={allowTooltips}
                content={
                  abilityIconOnly
                    ? "Show Ability Shapes"
                    : "Hide Ability Shapes"
                }
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleAbilityIconOnly}
                >
                  <span className="relative inline-flex items-center justify-center w-4 h-4 overflow-visible">
                    <Shapes className="w-4 h-4" />
                    {!abilityIconOnly && (
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

          <ConditionalTooltip
            enabled={allowTooltips}
            content={`Delete ${
              itemType === "agent"
                ? "Agent"
                : itemType === "ability"
                  ? "Ability"
                  : itemType === "image"
                    ? "Image"
                    : itemType === "tool"
                      ? "Icon"
                      : "Text"
            }`}
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
