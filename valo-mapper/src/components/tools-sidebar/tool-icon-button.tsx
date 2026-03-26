import { forwardRef } from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

interface ToolIconButtonProps {
  name: string;
  onClick?: () => void;
  onPointerDown?: (event: React.PointerEvent<HTMLButtonElement>) => void;
  fileEnding?: string;
}

export const ToolIconButton = forwardRef<
  HTMLButtonElement,
  ToolIconButtonProps
>(({ name, onClick, onPointerDown, fileEnding = "webp", ...props }, ref) => (
  <Button
    ref={ref}
    size="icon"
    variant="ghost"
    className="overflow-hidden relative flex items-center justify-center w-full aspect-square"
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
    />
  </Button>
));

ToolIconButton.displayName = "ToolIconButton";
