import { forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import Image from "next/image";

interface ToolIconButtonProps {
  name: string;
  onClick?: () => void;
  onPointerDown?: (event: React.PointerEvent<HTMLButtonElement>) => void;
  fileEnding?: string;
  selected?: boolean;
}

export const ToolIconButton = forwardRef<
  HTMLButtonElement,
  ToolIconButtonProps
>(
  (
    { name, onClick, onPointerDown, fileEnding = "webp", selected, ...props },
    ref,
  ) => (
    <Button
      ref={ref}
      size="icon"
      variant="ghost"
      aria-label={name}
      aria-pressed={selected}
      className={cn(
        "overflow-hidden relative flex items-center justify-center w-full aspect-square",
        selected &&
          "bg-accent text-accent-foreground ring-2 ring-primary/70",
      )}
      style={{
        touchAction: "none",
        WebkitTouchCallout: "none",
      }}
      onClick={onClick}
      onPointerDown={onPointerDown}
      {...props}
    >
      <Image
        src={`/tools/${name}.${fileEnding}`}
        alt={`${name} icon`}
        fill
        className="object-contain"
        sizes="w-full"
        draggable={false}
        onDragStart={(event) => event.preventDefault()}
      />
    </Button>
  ),
);

ToolIconButton.displayName = "ToolIconButton";
