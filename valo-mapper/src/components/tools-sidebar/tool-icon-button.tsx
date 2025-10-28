import { Button } from "@/components/ui/button";
import Image from "next/image";

interface ToolIconButtonProps {
  name: string;
  onClick?: () => void;
}

export const ToolIconButton = ({ name, onClick }: ToolIconButtonProps) => (
  <Button
    size="icon"
    variant="ghost"
    className="overflow-hidden relative flex items-center justify-center w-full aspect-square"
    onClick={onClick}
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
