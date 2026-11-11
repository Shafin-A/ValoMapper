import { fireEvent, render, screen } from "@testing-library/react";

import { MobileCanvasToolbar } from "@/components/canvas/mobile-canvas-toolbar";
import { useCanvas } from "@/contexts/canvas-context";
import type { MapStageHandle } from "@/components/canvas";

jest.mock("@/contexts/canvas-context", () => ({
  useCanvas: jest.fn(),
}));

jest.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => true,
}));

jest.mock("@/hooks/use-recenter-canvas", () => ({
  useRecenterCanvas: jest.fn(() => jest.fn()),
}));

jest.mock("@/components/tools-sidebar/delete-settings", () => ({
  DeleteSettings: () => <div>Delete settings</div>,
}));

const mockUseCanvas = jest.mocked(useCanvas);

const renderToolbar = () => {
  const onOpenTools = jest.fn();
  const onOpenAgents = jest.fn();
  const stageRef = { current: null as MapStageHandle | null };

  render(
    <MobileCanvasToolbar
      stageRef={stageRef}
      onOpenTools={onOpenTools}
      onOpenAgents={onOpenAgents}
    />,
  );

  return { onOpenTools, onOpenAgents };
};

describe("MobileCanvasToolbar", () => {
  const undo = jest.fn();
  const redo = jest.fn();
  const setIsDrawMode = jest.fn();
  const setTool = jest.fn();
  const setEditingTextId = jest.fn();
  const setIsDeleteSettingsOpen = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCanvas.mockReturnValue({
      undo,
      redo,
      canUndo: true,
      canRedo: true,
      isDrawMode: false,
      setIsDrawMode,
      tool: "pencil",
      setTool,
      setEditingTextId,
      setIsDeleteSettingsOpen,
    } as unknown as ReturnType<typeof useCanvas>);
  });

  it("runs undo and redo", () => {
    renderToolbar();

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    fireEvent.click(screen.getByRole("button", { name: "Redo" }));

    expect(undo).toHaveBeenCalledTimes(1);
    expect(redo).toHaveBeenCalledTimes(1);
  });

  it("enables draw and erase modes", () => {
    renderToolbar();

    fireEvent.click(screen.getByRole("button", { name: "Draw" }));
    expect(setIsDrawMode).toHaveBeenLastCalledWith(true);
    expect(setTool).toHaveBeenLastCalledWith("pencil");

    fireEvent.click(screen.getByRole("button", { name: "Erase" }));
    expect(setIsDrawMode).toHaveBeenLastCalledWith(true);
    expect(setTool).toHaveBeenLastCalledWith("eraser");
  });

  it("opens delete options and both sidebars", () => {
    const { onOpenTools, onOpenAgents } = renderToolbar();

    fireEvent.click(screen.getByRole("button", { name: "Open tools" }));
    expect(onOpenTools).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Open agents" }));
    expect(onOpenAgents).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Delete options" }));
    expect(screen.getByText("Delete settings")).toBeInTheDocument();
  });
});
