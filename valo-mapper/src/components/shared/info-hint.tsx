"use client";

import { Info } from "lucide-react";
import type { ReactNode } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface InfoHintProps {
  label: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export const InfoHint = ({
  label,
  children,
  className,
  contentClassName,
}: InfoHintProps) => {
  const isMobile = useIsMobile();

  const trigger = (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center sm:h-8 sm:w-8",
        className,
      )}
    >
      <Info className="h-4 w-4 text-muted-foreground" />
    </button>
  );

  if (isMobile) {
    return (
      <Popover>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent
          className={cn("max-w-xs text-sm", contentClassName)}
          align="start"
        >
          {children}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{trigger}</TooltipTrigger>
      <TooltipContent className={cn("max-w-xs", contentClassName)}>
        {children}
      </TooltipContent>
    </Tooltip>
  );
};
