import { Button } from "@/components/ui/button";
import Image from "next/image";

interface ToolIconButtonProps {
  name: string;
  onClick?: () => void;
  onPointerDown?: (event: React.PointerEvent<HTMLButtonElement>) => void;
}

export const ToolIconButton = ({
  name,
  onClick,
  onPointerDown,
}: ToolIconButtonProps) => (
  <Button
    size="icon"
    variant="ghost"
    className="overflow-hidden relative flex items-center justify-center w-full aspect-square"
    onClick={onClick}
    onPointerDown={onPointerDown}
  >
    <Image
      src={`/tools/${name}.webp`}
      alt={`${name} icon`}
      fill
      className="object-contain"
      sizes="w-full"
    />
  </Button>
);
