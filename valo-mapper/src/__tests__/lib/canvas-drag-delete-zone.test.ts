import type Konva from "konva";
import { handleDragEnd, handleDragMove } from "@/lib/konva-drag";

const mockIsMobileLayout = jest.fn(() => true);

jest.mock("@/lib/mobile-layout", () => ({
  isMobileLayout: () => mockIsMobileLayout(),
}));

const createDeleteGroup = () =>
  ({
    x: () => 0,
    y: () => 0,
    width: () => 100,
    height: () => 100,
    scaleX: () => 1,
    scaleY: () => 1,
    opacity: jest.fn(),
    visible: jest.fn(),
  }) as unknown as Konva.Group;

const createDraggedNode = () =>
  ({
    x: () => 20,
    y: () => 20,
    width: () => 10,
    height: () => 10,
    getAttr: () => false,
    setAttr: jest.fn(),
    getStage: () => ({ container: () => ({ style: {} }) }),
  }) as unknown as Konva.Node;

describe("canvas drag delete zone", () => {
  beforeEach(() => {
    mockIsMobileLayout.mockReturnValue(true);
  });

  it("shows the delete zone while dragging an item", () => {
    const deleteGroup = createDeleteGroup();

    handleDragMove(
      { target: createDraggedNode() } as never,
      { current: deleteGroup },
    );

    expect(deleteGroup.visible).toHaveBeenCalledWith(true);
  });

  it("hides the delete zone when a drag ends on mobile", () => {
    const deleteGroup = createDeleteGroup();

    handleDragEnd(
      { target: createDraggedNode() } as never,
      { id: "agent-1" } as never,
      jest.fn(),
      { current: deleteGroup },
    );

    expect(deleteGroup.visible).toHaveBeenCalledWith(false);
  });

  it("keeps the delete zone visible when a drag ends on desktop", () => {
    mockIsMobileLayout.mockReturnValue(false);

    const deleteGroup = createDeleteGroup();

    handleDragEnd(
      { target: createDraggedNode() } as never,
      { id: "agent-1" } as never,
      jest.fn(),
      { current: deleteGroup },
    );

    expect(deleteGroup.visible).toHaveBeenCalledWith(true);
  });
});
