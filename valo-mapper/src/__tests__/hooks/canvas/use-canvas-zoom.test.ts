import { renderHook } from "@testing-library/react";
import { useCanvasZoom } from "@/hooks/canvas/use-canvas-zoom";
import type { KonvaEventObject } from "konva/lib/Node";
import type { Stage } from "konva/lib/Stage";
import type Konva from "konva";
import type { RefObject } from "react";

type StageMock = {
  container: () => {
    offsetWidth: number;
    getBoundingClientRect: () => { left: number; top: number };
  };
  getPointerPosition: jest.Mock<{ x: number; y: number } | null, []>;
  scaleX: jest.Mock<number, []>;
  scale: jest.Mock<void, [{ x: number; y: number }]>;
  position: jest.Mock<{ x: number; y: number }, [{ x: number; y: number }?]>;
  x: jest.Mock<number, []>;
  y: jest.Mock<number, []>;
  draggable: jest.Mock<void, [boolean?]>;
  isDragging: jest.Mock<boolean, []>;
  stopDrag: jest.Mock<void, []>;
};

const createStageMock = (
  initialScale = 1,
  initialPos: { x: number; y: number } = { x: 0, y: 0 }
): StageMock => {
  let scale = initialScale;
  let position = { ...initialPos };

  const container = {
    offsetWidth: 1000,
    getBoundingClientRect: () => ({ left: 0, top: 0 }),
  };

  const stage: StageMock = {
    container: () => container,
    getPointerPosition: jest.fn(() => ({ x: 100, y: 100 })),
    scaleX: jest.fn(() => scale),
    scale: jest.fn(({ x }: { x: number; y: number }) => {
      scale = x;
    }),
    position: jest.fn((next?: { x: number; y: number }) => {
      if (next) {
        position = { ...next };
      }
      return position;
    }),
    x: jest.fn(() => position.x),
    y: jest.fn(() => position.y),
    draggable: jest.fn(),
    isDragging: jest.fn(() => false),
    stopDrag: jest.fn(),
  };

  return stage;
};

describe("useCanvasZoom", () => {
  it("positions and scales the delete group on drag move", () => {
    const stage = createStageMock(2, { x: 10, y: 20 });
    const stageRef: RefObject<Stage | null> = {
      current: stage as unknown as Stage,
    };

    const { result } = renderHook(() => useCanvasZoom(stageRef, 1, false));

    const deleteGroup = {
      position: jest.fn(),
      scale: jest.fn(),
    } as Partial<Konva.Group>;
    result.current.deleteGroupRef.current = deleteGroup as Konva.Group;

    result.current.handleDragMove();

    expect(deleteGroup.position).toHaveBeenCalledWith({ x: 265, y: 0 });
    expect(deleteGroup.scale).toHaveBeenCalledWith({ x: 0.5, y: 0.5 });
  });

  it("zooms with the wheel, clamps scale, and repositions", () => {
    const stage = createStageMock(3, { x: 0, y: 0 });
    const stageRef: RefObject<Stage | null> = {
      current: stage as unknown as Stage,
    };

    const { result } = renderHook(() => useCanvasZoom(stageRef, 1, false));

    const deleteGroup = {
      position: jest.fn(),
      scale: jest.fn(),
    } as Partial<Konva.Group>;
    result.current.deleteGroupRef.current = deleteGroup as Konva.Group;

    const preventDefault = jest.fn();

    const wheelEvent = {
      evt: {
        deltaY: -1,
        ctrlKey: false,
        preventDefault,
      },
    } as unknown as KonvaEventObject<WheelEvent>;

    result.current.handleWheel(wheelEvent);

    expect(preventDefault).toHaveBeenCalled();
    expect(stage.scale).toHaveBeenCalledWith({ x: 3.75, y: 3.75 });
    const firstPositionCall = stage.position.mock.calls[0]?.[0];
    expect(firstPositionCall?.x).toBeCloseTo(-25, 5);
    expect(firstPositionCall?.y).toBeCloseTo(-25, 5);
    expect(deleteGroup.position).toHaveBeenCalled();
  });

  it("handles pinch start, move, and end", () => {
    const stage = createStageMock(2, { x: 0, y: 0 });
    stage.isDragging = jest.fn(() => true);
    const stageRef: RefObject<Stage | null> = {
      current: stage as unknown as Stage,
    };

    const { result } = renderHook(() => useCanvasZoom(stageRef, 1, false));

    const startEvent = {
      evt: {
        touches: [
          { clientX: 0, clientY: 0 },
          { clientX: 0, clientY: 10 },
        ],
        preventDefault: jest.fn(),
      },
      target: {},
    } as unknown as KonvaEventObject<TouchEvent>;

    result.current.handleTouchStart(startEvent);

    expect(stage.stopDrag).toHaveBeenCalled();
    expect(stage.draggable).toHaveBeenCalledWith(false);

    const moveEvent = {
      evt: {
        touches: [
          { clientX: 0, clientY: 0 },
          { clientX: 0, clientY: 20 },
        ],
        preventDefault: jest.fn(),
      },
      target: {},
    } as unknown as KonvaEventObject<TouchEvent>;

    result.current.handleTouchMove(moveEvent);

    expect(moveEvent.evt.preventDefault).toHaveBeenCalled();
    expect(stage.scale).toHaveBeenCalledWith({ x: 4, y: 4 });
    expect(stage.position).toHaveBeenCalledWith({ x: 0, y: 0 });

    const endEvent = {
      evt: { touches: [] },
    } as unknown as KonvaEventObject<TouchEvent>;
    result.current.handleTouchEnd(endEvent);

    expect(stage.draggable).toHaveBeenLastCalledWith(true);
  });
});
