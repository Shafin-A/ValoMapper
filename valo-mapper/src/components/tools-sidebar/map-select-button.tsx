import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapOption } from "@/lib/types";

interface MapSelectButtonProps {
  mapOptions: MapOption[];
  defaultSelectedId?: string;
  onMapSelect?: (selectedMap: MapOption) => void;
  className?: string;
}

export const MapSelectButton = ({
  mapOptions,
  defaultSelectedId,
  onMapSelect,
  className = "",
}: MapSelectButtonProps) => {
  const defaultSelected = defaultSelectedId
    ? mapOptions.find((option) => option.id === defaultSelectedId) ||
      mapOptions[0]
    : mapOptions[0];

  const [selectedMap, setSelectedMap] = useState<MapOption>(defaultSelected);

  const handleMapSelect = (option: MapOption) => {
    setSelectedMap(option);
    onMapSelect?.(option);
  };

  if (!mapOptions || mapOptions.length === 0) {
    return null;
  }

  return (
    <div className={`flex justify-center ${className}`}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="relative h-20 w-64 hover:opacity-80 transition-opacity border-2 border-gray-300 hover:border-gray-400 p-0 overflow-hidden"
            style={{
              backgroundImage: `url(${selectedMap.listview_src})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
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

        <DropdownMenuContent className="w-64" align="center">
          <ScrollArea className="w-64 h-80">
            {mapOptions.map((option) => (
              <DropdownMenuItem
                key={option.id}
                onClick={() => handleMapSelect(option)}
                className="p-0 cursor-pointer focus:bg-transparent"
              >
                <div
                  className="relative w-full h-20 hover:opacity-80 transition-opacity rounded-sm overflow-hidden flex items-center justify-center"
                  style={{
                    backgroundImage: `url(${option.listview_src})`,
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
    </div>
  );
};
