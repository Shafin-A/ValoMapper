import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AbilityCanvas, AgentCanvas } from "@/lib/types";
import { Copy, Heart, HeartCrack, Trash2 } from "lucide-react";
import { Separator } from "./ui/separator";

interface ContextMenuPopoverProps {
  open: boolean;
  x: number;
  y: number;
  itemType: "agent" | "ability";
  currentItem: AgentCanvas | AbilityCanvas | null;
  onOpenChange: (open: boolean) => void;
  onDuplicate: () => void;
  onToggleAlly: () => void;
  onDelete: () => void;
}

export const ContextMenuPopover = ({
  open,
  x,
  y,
  itemType,
  currentItem,
  onOpenChange,
  onDuplicate,
  onToggleAlly,
  onDelete,
}: ContextMenuPopoverProps) => {
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
      <PopoverContent
        className="w-auto p-2"
        side="top"
        align="start"
        sideOffset={4}
      >
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onDuplicate}
            title={`Duplicate ${itemType === "agent" ? "Agent" : "Ability"}`}
          >
            <Copy />
          </Button>
          <Separator
            orientation="vertical"
            className="data-[orientation=vertical]:h-6"
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onToggleAlly}
            title={currentItem?.isAlly ? "Toggle Enemy" : "Toggle Ally"}
          >
            {currentItem?.isAlly ? <HeartCrack /> : <Heart />}
          </Button>
          <Separator
            orientation="vertical"
            className="data-[orientation=vertical]:h-6"
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onDelete}
            title={`Delete ${itemType === "agent" ? "Agent" : "Ability"}`}
          >
            <Trash2 />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
