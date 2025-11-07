import { MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

interface FolderCardProps {
  name: string;
  onClick?: () => void;
  onMenuClick?: () => void;
  className?: string;
}

export const FolderCard = ({
  name,
  onClick,
  onMenuClick,
  className,
}: FolderCardProps) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative w-56 h-56 cursor-pointer select-none transition-transform duration-200",
        className
      )}
    >
      <svg
        className="absolute inset-0 w-full h-full text-zinc-900 fill-zinc-900"
        viewBox="0 0 224 224"
        preserveAspectRatio="none"
      >
        <path d="M 0,16 Q 0,0 16,0 L 80,0 L 95,40 L 208,40 Q 224,40 224,56 L 224,208 Q 224,224 208,224 L 16,224 Q 0,224 0,208 Z" />
      </svg>

      <div className="absolute inset-0 flex flex-col justify-between p-3">
        <Button
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onMenuClick?.();
          }}
          className="self-end mt-10 rounded-full"
        >
          <MoreVertical size={18} />
        </Button>

        <div className="text-center mb-8">
          <p className="text-white font-medium truncate">{name}</p>
        </div>
      </div>
    </div>
  );
};
