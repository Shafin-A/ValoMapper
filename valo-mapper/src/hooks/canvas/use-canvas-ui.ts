import { MAP_OPTIONS } from "@/lib/consts";
import { MapOption, DrawLine, Tool, AbilityIconItem, Agent } from "@/lib/types";
import { useRef, useState } from "react";

export const useCanvasUI = () => {
  const [isAlly, setIsAlly] = useState(true);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  const [selectedMap, setSelectedMap] = useState<MapOption>(MAP_OPTIONS[1]); // Default Ascent
  const [mapSide, setMapSide] = useState<"attack" | "defense">("defense");

  const [currentStroke, setCurrentStroke] = useState<DrawLine | null>(null);
  const [tool, setTool] = useState<Tool>("pencil");
  const [isDrawMode, setIsDrawMode] = useState(false);
  const isDrawing = useRef(false);

  const [isDeleteSettingsOpen, setIsDeleteSettingsOpen] = useState(false);
  const [showCallouts, setShowCallouts] = useState(false);
  const [showUltOrbs, setShowUltOrbs] = useState(false);
  const [showSpawnBarriers, setShowSpawnBarriers] = useState(false);

  const [selectedCanvasIcon, setSelectedCanvasIcon] = useState<
    Agent | AbilityIconItem | null
  >(null);

  const resetEdits = () => {
    setEditingTextId(null);
    setSelectedCanvasIcon(null);
  };

  return {
    isAlly,
    setIsAlly,
    editingTextId,
    setEditingTextId,
    selectedMap,
    setSelectedMap,
    mapSide,
    setMapSide,
    currentStroke,
    setCurrentStroke,
    tool,
    setTool,
    isDrawMode,
    setIsDrawMode,
    isDrawing,
    isDeleteSettingsOpen,
    setIsDeleteSettingsOpen,
    showCallouts,
    setShowCallouts,
    showUltOrbs,
    setShowUltOrbs,
    showSpawnBarriers,
    setShowSpawnBarriers,
    selectedCanvasIcon,
    setSelectedCanvasIcon,
    resetEdits,
  };
};
