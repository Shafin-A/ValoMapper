import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, RefreshCw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapOption, MapSide } from "@/lib/types";

interface MapSelectProps {
  mapOptions: MapOption[];
  onMapSelect?: (selectedMap: MapOption) => void;
  className?: string;
  selectedMap: MapOption;
  setSelectedMap: React.Dispatch<React.SetStateAction<MapOption>>;
  allyColor: string;
  enemyColor: string;
  mapSide: MapSide;
  setMapSide: React.Dispatch<React.SetStateAction<MapSide>>;
  onMapRotate?: () => void;
  disabled?: boolean;
}

export const MapSelect = ({
  mapOptions,
  onMapSelect,
  className = "",
  selectedMap,
  setSelectedMap,
  allyColor,
  enemyColor,
  mapSide,
  setMapSide,
  onMapRotate,
  disabled = false,
}: MapSelectProps) => {
  const handleMapSelect = (option: MapOption) => {
    if (disabled) return;
    setSelectedMap(option);
    onMapSelect?.(option);
  };

  const handleRotationToggle = () => {
    if (disabled) return;
    setMapSide((prev) => (prev === "attack" ? "defense" : "attack"));
    onMapRotate?.();
  };

  if (!mapOptions || mapOptions.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <Button
            data-tour="map-selector"
            variant="outline"
            className="relative h-20 w-56 hover:opacity-80 transition-all duration-400 ease-in-out border-2 border-gray-300 hover:border-gray-400 p-0 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundImage: `url(/maps/listviewicons/${selectedMap.id}.webp)`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
            disabled={disabled}
          >
            <div className="absolute inset-0 bg-black/30" />

            <div className="relative z-10 flex items-center justify-center w-full h-full">
              <span
                className={`font-semibold text-lg drop-shadow-lg ${selectedMap.textColor}`}
              >
                {selectedMap.text}
              </span>
            </div>

            <ChevronDown
              className={`w-4 h-4 ${selectedMap.textColor} absolute bottom-2 right-2 z-10 drop-shadow-lg`}
            />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-full" align="start">
          <ScrollArea className="w-72 h-80">
            {mapOptions.map((option) => (
              <DropdownMenuItem
                key={option.id}
                onClick={() => handleMapSelect(option)}
                className="p-0 cursor-pointer focus:bg-transparent"
                disabled={disabled}
              >
                <div
                  className="relative w-full h-20 hover:opacity-80 transition-opacity rounded-sm overflow-hidden flex items-center justify-center"
                  style={{
                    backgroundImage: `url(/maps/listviewicons/${option.id}.webp)`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  <div className="absolute inset-0 bg-black/30" />

                  <div className="relative z-10 flex items-center justify-center w-full h-full">
                    <span
                      className={`font-medium text-sm drop-shadow-lg ${option.textColor}`}
                    >
                      {option.text}
                    </span>
                  </div>

                  {selectedMap.id === option.id && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary-foreground shadow-md z-10" />
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        data-tour="map-rotation"
        variant="outline"
        onClick={handleRotationToggle}
        className="h-20 w-16 transition-all duration-200 flex flex-col items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={disabled}
      >
        <RefreshCw
          className={`size-8 transition-transform duration-500 ${
            mapSide === "attack" ? "rotate-0" : "rotate-180"
          }`}
          color={mapSide === "attack" ? enemyColor : allyColor}
        />
        <span className="text-xs text-white font-semibold uppercase">
          {mapSide}
        </span>
      </Button>
    </div>
  );
};
