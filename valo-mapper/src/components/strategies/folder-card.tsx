import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { FolderPen, MoreVertical, Trash2 } from "lucide-react";

interface FolderCardProps {
  name: string;
  onClick?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  className?: string;
}

export const FolderCard = ({
  name,
  onClick,
  onRename,
  onDelete,
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              onClick={(e) => e.stopPropagation()}
              className="self-end mt-10 rounded-full"
            >
              <MoreVertical size={18} />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onRename?.();
              }}
            >
              <FolderPen />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.();
              }}
            >
              <Trash2 className="text-destructive" />
              <span className="text-destructive">Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="text-center mb-8">
          <p className="text-white font-medium truncate">{name}</p>
        </div>
      </div>
    </div>
  );
};
