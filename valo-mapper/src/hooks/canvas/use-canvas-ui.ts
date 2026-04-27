import { DEFAULT_MAP_OPTIONS } from "@/lib/consts";
import {
  MapOption,
  MapSide,
  DrawLine,
  Tool,
  AbilityIconItem,
  Agent,
  ToolIconCanvas,
} from "@/lib/types";
import { useRef, useState } from "react";

interface UseCanvasUIOptions {
  initialMapSide?: MapSide;
  initialSelectedMap?: MapOption;
}

export const useCanvasUI = ({
  initialMapSide = "defense",
  initialSelectedMap = DEFAULT_MAP_OPTIONS[0],
}: UseCanvasUIOptions = {}) => {
  const [isAlly, setIsAlly] = useState(true);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  const [selectedMap, setSelectedMap] = useState<MapOption>(initialSelectedMap);
  const [mapSide, setMapSide] = useState<MapSide>(initialMapSide);

  const [currentStroke, setCurrentStroke] = useState<DrawLine | null>(null);
  const [tool, setTool] = useState<Tool>("pencil");
  const [isDrawMode, setIsDrawMode] = useState(false);
  const isDrawing = useRef(false);

  const [isDeleteSettingsOpen, setIsDeleteSettingsOpen] = useState(false);
  const [showCallouts, setShowCallouts] = useState(false);
  const [showUltOrbs, setShowUltOrbs] = useState(false);
  const [showSpawnBarriers, setShowSpawnBarriers] = useState(false);

  const [selectedCanvasIcon, setSelectedCanvasIcon] = useState<
    Agent | AbilityIconItem | ToolIconCanvas | null
  >(null);
  const [isSidebarDragActive, setIsSidebarDragActive] = useState(false);
  const [currentStageScale, setCurrentStageScale] = useState(1);

  const resetEdits = () => {
    setEditingTextId(null);
    setSelectedCanvasIcon(null);
    setIsSidebarDragActive(false);
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
    isSidebarDragActive,
    setIsSidebarDragActive,
    currentStageScale,
    setCurrentStageScale,
    resetEdits,
  };
};
