import {
  type Dispatch,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  AbilityCanvas,
  AbilityIconItem,
  Agent,
  AgentCanvas,
  ToolIconCanvas,
} from "@/lib/types";
import { TEMP_DRAG_ID } from "@/lib/consts";
import { isAgent } from "@/lib/utils";

type PendingSidebarDrag = {
  pointerId: number;
  startX: number;
  startY: number;
  pointerType: string;
  icon: Agent | AbilityIconItem;
  kind: "agent" | "ability";
};

interface UseAgentsSidebarDragOptions {
  selectedCanvasIcon: Agent | AbilityIconItem | ToolIconCanvas | null;
  setSelectedCanvasIcon: Dispatch<
    SetStateAction<Agent | AbilityIconItem | ToolIconCanvas | null>
  >;
  isSidebarDragActive: boolean;
  setIsSidebarDragActive: Dispatch<SetStateAction<boolean>>;
  isAlly: boolean;
  agentsOnCanvas: AgentCanvas[];
  abilitiesOnCanvas: AbilityCanvas[];
  setAgentsOnCanvas: Dispatch<SetStateAction<AgentCanvas[]>>;
  setAbilitiesOnCanvas: Dispatch<SetStateAction<AbilityCanvas[]>>;
  setToolIconsOnCanvas: Dispatch<SetStateAction<ToolIconCanvas[]>>;
  setSelectedAgentAbilities: Dispatch<SetStateAction<Agent | null>>;
  setIsDrawMode: Dispatch<SetStateAction<boolean>>;
  setEditingTextId: Dispatch<SetStateAction<string | null>>;
}

export const useAgentsSidebarDrag = ({
  selectedCanvasIcon,
  setSelectedCanvasIcon,
  isSidebarDragActive,
  setIsSidebarDragActive,
  isAlly,
  agentsOnCanvas,
  abilitiesOnCanvas,
  setAgentsOnCanvas,
  setAbilitiesOnCanvas,
  setToolIconsOnCanvas,
  setSelectedAgentAbilities,
  setIsDrawMode,
  setEditingTextId,
}: UseAgentsSidebarDragOptions) => {
  const [dragPreviewPosition, setDragPreviewPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const pendingSidebarDragRef = useRef<PendingSidebarDrag | null>(null);
  const didStartSidebarDragRef = useRef(false);
  const suppressClickUntilRef = useRef(0);
  const ignoreNextSidebarClickRef = useRef(false);

  const tempDragAgent = agentsOnCanvas.find(
    (agent) => agent.id === TEMP_DRAG_ID,
  );
  const tempDragAbility = abilitiesOnCanvas.find(
    (ability) => ability.id === TEMP_DRAG_ID,
  );

  useEffect(() => {
    if (!isSidebarDragActive) {
      setDragPreviewPosition(null);
      return;
    }

    const handleWindowPointerMove = (event: PointerEvent) => {
      setDragPreviewPosition({ x: event.clientX, y: event.clientY });
    };

    const clearDragPreview = () => {
      setDragPreviewPosition(null);
    };

    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", clearDragPreview);
    window.addEventListener("pointercancel", clearDragPreview);

    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", clearDragPreview);
      window.removeEventListener("pointercancel", clearDragPreview);
    };
  }, [isSidebarDragActive]);

  useEffect(() => {
    const updateViewportSize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    };

    updateViewportSize();
    window.addEventListener("resize", updateViewportSize);

    return () => {
      window.removeEventListener("resize", updateViewportSize);
    };
  }, []);

  const beginIconPlacement = useCallback(
    <T extends AgentCanvas | AbilityCanvas>(
      icon: Agent | AbilityIconItem,
      setIconsOnCanvas: Dispatch<SetStateAction<T[]>>,
    ) => {
      setSelectedCanvasIcon(icon);
      if (isAgent(icon)) {
        setSelectedAgentAbilities(icon);
      }

      // Clear any stale TEMP_DRAG_ID from the other lists before adding to this one
      setAgentsOnCanvas((prev) => prev.filter((c) => c.id !== TEMP_DRAG_ID));
      setAbilitiesOnCanvas((prev) => prev.filter((c) => c.id !== TEMP_DRAG_ID));
      setToolIconsOnCanvas((prev) =>
        prev.filter((c) => c.id !== TEMP_DRAG_ID),
      );

      const newCanvasIcon = {
        ...icon,
        id: TEMP_DRAG_ID,
        isAlly: isAlly,
        x: -1000,
        y: -1000,
      } as T;

      setIconsOnCanvas((prev) => {
        const withoutDrag = prev.filter(
          (canvasIcon) => canvasIcon.id !== TEMP_DRAG_ID,
        );
        return [...withoutDrag, newCanvasIcon];
      });
    },
    [
      isAlly,
      setAgentsOnCanvas,
      setAbilitiesOnCanvas,
      setSelectedAgentAbilities,
      setSelectedCanvasIcon,
      setToolIconsOnCanvas,
    ],
  );

  const clearSelection = useCallback(() => {
    setSelectedCanvasIcon(null);
    setAgentsOnCanvas((prev) => prev.filter((c) => c.id !== TEMP_DRAG_ID));
    setAbilitiesOnCanvas((prev) => prev.filter((c) => c.id !== TEMP_DRAG_ID));
    setToolIconsOnCanvas((prev) =>
      prev.filter((c) => c.id !== TEMP_DRAG_ID),
    );
  }, [
    setAgentsOnCanvas,
    setAbilitiesOnCanvas,
    setSelectedCanvasIcon,
    setToolIconsOnCanvas,
  ]);

  const handleIconClick = <T extends AgentCanvas | AbilityCanvas>(
    icon: Agent | AbilityIconItem,
    setIconsOnCanvas: Dispatch<SetStateAction<T[]>>,
  ) => {
    if (ignoreNextSidebarClickRef.current) {
      ignoreNextSidebarClickRef.current = false;
      return false;
    }

    if (performance.now() < suppressClickUntilRef.current) {
      return false;
    }

    const isSameIcon = selectedCanvasIcon
      ? isAgent(selectedCanvasIcon) && isAgent(icon)
        ? selectedCanvasIcon.name === icon.name
        : !isAgent(selectedCanvasIcon) &&
          !isAgent(icon) &&
          selectedCanvasIcon.id === icon.id
      : false;

    if (isSameIcon) {
      if (isSidebarDragActive) {
        setIsSidebarDragActive(false);
        return true;
      }

      setIconsOnCanvas((prev) =>
        prev.filter((canvasIcon) => canvasIcon.id !== TEMP_DRAG_ID),
      );
      setSelectedCanvasIcon(null);
    } else {
      beginIconPlacement(icon, setIconsOnCanvas);
      setIsSidebarDragActive(false);
    }

    return true;
  };

  const handleIconPointerDown = (
    event: ReactPointerEvent,
    icon: Agent | AbilityIconItem,
    kind: "agent" | "ability",
  ) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    ignoreNextSidebarClickRef.current = false;
    suppressClickUntilRef.current = 0;

    event.preventDefault();

    if (typeof event.currentTarget.setPointerCapture === "function") {
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    const isSameIcon = selectedCanvasIcon
      ? isAgent(selectedCanvasIcon) && isAgent(icon)
        ? selectedCanvasIcon.name === icon.name
        : !isAgent(selectedCanvasIcon) &&
          !isAgent(icon) &&
          selectedCanvasIcon.id === icon.id
      : false;
    if (isSameIcon) {
      return;
    }

    pendingSidebarDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      pointerType: event.pointerType,
      icon,
      kind,
    };
    didStartSidebarDragRef.current = false;
  };

  useEffect(() => {
    const DRAG_START_DISTANCE_PX = 4;
    const PEN_DRAG_START_DISTANCE_PX = 10;

    const handleWindowPointerMove = (event: PointerEvent) => {
      const pendingDrag = pendingSidebarDragRef.current;
      if (!pendingDrag || pendingDrag.pointerId !== event.pointerId) {
        return;
      }

      const dx = event.clientX - pendingDrag.startX;
      const dy = event.clientY - pendingDrag.startY;
      const dragDistance = Math.hypot(dx, dy);
      const dragStartDistance =
        pendingDrag.pointerType === "pen"
          ? PEN_DRAG_START_DISTANCE_PX
          : DRAG_START_DISTANCE_PX;

      if (dragDistance < dragStartDistance) {
        return;
      }

      setIsDrawMode(false);
      setEditingTextId(null);
      setDragPreviewPosition({ x: event.clientX, y: event.clientY });

      if (pendingDrag.kind === "agent") {
        beginIconPlacement(pendingDrag.icon as Agent, setAgentsOnCanvas);
      } else {
        beginIconPlacement(
          pendingDrag.icon as AbilityIconItem,
          setAbilitiesOnCanvas,
        );
      }

      ignoreNextSidebarClickRef.current = true;
      setIsSidebarDragActive(true);
      didStartSidebarDragRef.current = true;
      pendingSidebarDragRef.current = null;
    };

    const clearPendingDrag = (event: PointerEvent) => {
      const pendingDrag = pendingSidebarDragRef.current;
      if (pendingDrag && pendingDrag.pointerId === event.pointerId) {
        pendingSidebarDragRef.current = null;
      }

      if (didStartSidebarDragRef.current) {
        suppressClickUntilRef.current = performance.now() + 250;
        didStartSidebarDragRef.current = false;
      }
    };

    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", clearPendingDrag);
    window.addEventListener("pointercancel", clearPendingDrag);

    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", clearPendingDrag);
      window.removeEventListener("pointercancel", clearPendingDrag);
    };
  }, [
    beginIconPlacement,
    setAgentsOnCanvas,
    setAbilitiesOnCanvas,
    setEditingTextId,
    setIsDrawMode,
    setIsSidebarDragActive,
  ]);

  return {
    dragPreviewPosition,
    viewportSize,
    tempDragAgent,
    tempDragAbility,
    clearSelection,
    handleIconClick,
    handleIconPointerDown,
  };
};
