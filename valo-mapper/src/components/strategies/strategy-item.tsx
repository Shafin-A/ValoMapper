import { MoreVertical } from "lucide-react";
import Image from "next/image";
import { cn, getRelativeTime } from "@/lib/utils";
import { Button } from "../ui/button";

interface StrategyItemProps {
  name: string;
  selectedMapId: string;
  updatedAt: Date;
  onClick?: () => void;
  onMenuClick?: () => void;
  className?: string;
}

export const StrategyItem = ({
  name,
  selectedMapId,
  updatedAt,
  onClick,
  onMenuClick,
  className,
}: StrategyItemProps) => {
  const mapId = selectedMapId;

  const imageUrl = mapId ? `/maps/listviewicons/${mapId}.webp` : "";

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative flex flex-col w-56 rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900  transition-all cursor-pointer group",
        className
      )}
    >
      <div className="relative h-32 w-full bg-zinc-950">
        <Image
          src={imageUrl}
          alt={mapId ?? "Map preview"}
          fill
          className="object-cover opacity-90 group-hover:opacity-100 transition-opacity"
        />

        <Button
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onMenuClick?.();
          }}
          className="absolute top-2 right-2 rounded-full"
        >
          <MoreVertical size={16} />
        </Button>
      </div>

      <div className="flex flex-col gap-1 px-3 py-3">
        <p className="text-white font-medium truncate">{name}</p>
        <p className="text-white font-medium truncate capitalize">{mapId}</p>
        <p className="text-xs text-zinc-400">
          Updated {getRelativeTime(updatedAt)}
        </p>
      </div>
    </div>
  );
};
