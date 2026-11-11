import type Konva from "konva";
import { handleDragEnd, handleDragMove } from "@/lib/utils";

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
  it("shows the delete zone while dragging an item", () => {
    const deleteGroup = createDeleteGroup();

    handleDragMove(
      { target: createDraggedNode() } as never,
      { current: deleteGroup },
    );

    expect(deleteGroup.visible).toHaveBeenCalledWith(true);
  });

  it("hides the delete zone when the drag ends", () => {
    const deleteGroup = createDeleteGroup();

    handleDragEnd(
      { target: createDraggedNode() } as never,
      { id: "agent-1" } as never,
      jest.fn(),
      { current: deleteGroup },
    );

    expect(deleteGroup.visible).toHaveBeenCalledWith(false);
  });
});
