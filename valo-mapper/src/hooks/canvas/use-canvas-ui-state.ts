import {
  readCanvasBackground,
  writeCanvasBackground,
} from "@/lib/canvas-background";
import { DEFAULT_MAP_OPTIONS } from "@/lib/consts";
import {
  CanvasBackground,
  MapOption,
  MapSide,
  Tool,
  AbilityIconItem,
  Agent,
  CanvasSelectionItem,
  ToolIconCanvas,
} from "@/lib/types";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

interface UseCanvasUIOptions {
  initialMapSide?: MapSide;
  initialSelectedMap?: MapOption;
  lobbyCode?: string;
}

export const useCanvasUiState = ({
  initialMapSide = "defense",
  initialSelectedMap = DEFAULT_MAP_OPTIONS[0],
  lobbyCode = "",
}: UseCanvasUIOptions = {}) => {
  const [isAlly, setIsAlly] = useState(true);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingNoteTarget, setEditingNoteTarget] =
    useState<CanvasSelectionItem | null>(null);

  const [selectedMap, setSelectedMap] = useState<MapOption>(initialSelectedMap);
  const [mapSide, setMapSide] = useState<MapSide>(initialMapSide);

  const [tool, setTool] = useState<Tool>("pencil");
  const [isDrawMode, setIsDrawMode] = useState(false);
  const isDrawing = useRef(false);

  const [isDeleteSettingsOpen, setIsDeleteSettingsOpen] = useState(false);
  const [showCallouts, setShowCallouts] = useState(false);
  const [showUltOrbs, setShowUltOrbs] = useState(false);
  const [showSpawnBarriers, setShowSpawnBarriers] = useState(false);
  const [canvasBackground, setCanvasBackgroundState] =
    useState<CanvasBackground>("none");

  useEffect(() => {
    setCanvasBackgroundState(readCanvasBackground(lobbyCode));
  }, [lobbyCode]);

  const setCanvasBackground = useCallback<
    Dispatch<SetStateAction<CanvasBackground>>
  >(
    (value) => {
      setCanvasBackgroundState((previous) => {
        const next = typeof value === "function" ? value(previous) : value;
        writeCanvasBackground(lobbyCode, next);
        return next;
      });
    },
    [lobbyCode],
  );

  const [selectedCanvasIcon, setSelectedCanvasIcon] = useState<
    Agent | AbilityIconItem | ToolIconCanvas | null
  >(null);
  const [selectedCanvasItems, setSelectedCanvasItems] = useState<
    CanvasSelectionItem[]
  >([]);
  const [isSidebarDragActive, setIsSidebarDragActive] = useState(false);
  const [isDraggingCanvasItem, setIsDraggingCanvasItem] = useState(false);
  const [currentStageScale, setCurrentStageScale] = useState(1);

  const resetEdits = useCallback(() => {
    setEditingTextId(null);
    setEditingNoteTarget(null);
    setSelectedCanvasIcon(null);
    setSelectedCanvasItems([]);
    setIsSidebarDragActive(false);
    setIsDraggingCanvasItem(false);
  }, [
    setEditingTextId,
    setEditingNoteTarget,
    setSelectedCanvasIcon,
    setSelectedCanvasItems,
    setIsSidebarDragActive,
    setIsDraggingCanvasItem,
  ]);

  return {
    isAlly,
    setIsAlly,
    editingTextId,
    setEditingTextId,
    editingNoteTarget,
    setEditingNoteTarget,
    selectedMap,
    setSelectedMap,
    mapSide,
    setMapSide,
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
    canvasBackground,
    setCanvasBackground,
    selectedCanvasIcon,
    setSelectedCanvasIcon,
    selectedCanvasItems,
    setSelectedCanvasItems,
    isSidebarDragActive,
    setIsSidebarDragActive,
    isDraggingCanvasItem,
    setIsDraggingCanvasItem,
    currentStageScale,
    setCurrentStageScale,
    resetEdits,
  };
};
