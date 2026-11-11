import { renderHook } from "@testing-library/react";
import { useCanvasZoom } from "@/hooks/canvas/use-canvas-zoom";
import { useIsMobile } from "@/hooks/use-mobile";
import type { KonvaEventObject } from "konva/lib/Node";
import type { Stage } from "konva/lib/Stage";
import type Konva from "konva";
import type { RefObject } from "react";

jest.mock("@/hooks/use-mobile");

const mockUseIsMobile = jest.mocked(useIsMobile);

type StageMock = {
  container: () => {
    offsetWidth: number;
    offsetHeight: number;
    parentElement: {
      offsetWidth: number;
      offsetHeight: number;
    } | null;
    getBoundingClientRect: () => { left: number; top: number };
  };
  getPointerPosition: jest.Mock<{ x: number; y: number } | null, []>;
  scaleX: jest.Mock<number, []>;
  scale: jest.Mock<void, [{ x: number; y: number }]>;
  position: jest.Mock<{ x: number; y: number }, [{ x: number; y: number }?]>;
  x: jest.Mock<number, []>;
  y: jest.Mock<number, []>;
  width: jest.Mock<number, []>;
  height: jest.Mock<number, []>;
  batchDraw: jest.Mock<void, []>;
  draggable: jest.Mock<void, [boolean?]>;
  isDragging: jest.Mock<boolean, []>;
  stopDrag: jest.Mock<void, []>;
};

const createStageMock = (
  initialScale = 1,
  initialPos: { x: number; y: number } = { x: 0, y: 0 },
  containerSize: { width: number; height: number } = {
    width: 1000,
    height: 800,
  },
): StageMock => {
  let scale = initialScale;
  let position = { ...initialPos };

  const container = {
    offsetWidth: containerSize.width,
    offsetHeight: containerSize.height,
    parentElement: {
      offsetWidth: containerSize.width,
      offsetHeight: containerSize.height,
    },
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
    width: jest.fn(() => 1000),
    height: jest.fn(() => 800),
    batchDraw: jest.fn(),
    draggable: jest.fn(),
    isDragging: jest.fn(() => false),
    stopDrag: jest.fn(),
  };

  return stage;
};

describe("useCanvasZoom", () => {
  beforeEach(() => {
    mockUseIsMobile.mockReturnValue(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

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

    expect(deleteGroup.position).toHaveBeenCalledWith({ x: 275, y: 0 });
    expect(deleteGroup.scale).toHaveBeenCalledWith({ x: 0.5, y: 0.5 });
  });

  it("positions delete zone at top right on small screens", () => {
    const stage = createStageMock(
      1,
      { x: 0, y: 0 },
      { width: 390, height: 844 },
    );
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

    expect(deleteGroup.position).toHaveBeenCalledWith({ x: 282, y: 24 });
    expect(deleteGroup.scale).toHaveBeenCalledWith({ x: 1, y: 1 });
  });

  it("positions the delete zone top-right on tablets using the mobile layout", () => {
    mockUseIsMobile.mockReturnValue(true);

    const stage = createStageMock(
      1,
      { x: 0, y: 0 },
      { width: 800, height: 800 },
    );
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

    expect(deleteGroup.position).toHaveBeenCalledWith({
      x: 800 - 84 - 24,
      y: 24,
    });
    expect(deleteGroup.scale).toHaveBeenCalledWith({ x: 1, y: 1 });
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

  it("allows a deeper zoom on touch devices", () => {
    const matchMediaSpy = jest
      .spyOn(window, "matchMedia")
      .mockReturnValue({ matches: true } as MediaQueryList);

    const stage = createStageMock(7, { x: 0, y: 0 });
    const stageRef: RefObject<Stage | null> = {
      current: stage as unknown as Stage,
    };

    const { result } = renderHook(() => useCanvasZoom(stageRef, 1, false));

    const wheelEvent = {
      evt: {
        deltaY: -1,
        ctrlKey: false,
        preventDefault: jest.fn(),
      },
    } as unknown as KonvaEventObject<WheelEvent>;

    result.current.handleWheel(wheelEvent);

    expect(stage.scale).toHaveBeenCalledWith({ x: 8, y: 8 });

    matchMediaSpy.mockRestore();
  });

  it("keeps the desktop max zoom on fine pointers", () => {
    const matchMediaSpy = jest
      .spyOn(window, "matchMedia")
      .mockReturnValue({ matches: false } as MediaQueryList);

    const stage = createStageMock(7, { x: 0, y: 0 });
    const stageRef: RefObject<Stage | null> = {
      current: stage as unknown as Stage,
    };

    const { result } = renderHook(() => useCanvasZoom(stageRef, 1, false));

    const wheelEvent = {
      evt: {
        deltaY: -1,
        ctrlKey: false,
        preventDefault: jest.fn(),
      },
    } as unknown as KonvaEventObject<WheelEvent>;

    result.current.handleWheel(wheelEvent);

    expect(stage.scale).toHaveBeenCalledWith({ x: 4, y: 4 });

    matchMediaSpy.mockRestore();
  });

  it("zooms in and out around the viewport center", () => {
    const stage = createStageMock(1, { x: 0, y: 0 });
    const stageRef: RefObject<Stage | null> = {
      current: stage as unknown as Stage,
    };

    const { result } = renderHook(() => useCanvasZoom(stageRef, 1, false));

    result.current.handleZoomIn();

    expect(stage.scale).toHaveBeenLastCalledWith({ x: 1.25, y: 1.25 });
    expect(stage.position).toHaveBeenLastCalledWith({
      x: -125,
      y: -100,
    });

    result.current.handleZoomOut();

    expect(stage.scale).toHaveBeenLastCalledWith({ x: 1, y: 1 });
    expect(stage.position).toHaveBeenLastCalledWith({ x: 0, y: 0 });
  });

  it("resets zoom to the fit scale", () => {
    const stage = createStageMock(2, { x: -200, y: -100 });
    const stageRef: RefObject<Stage | null> = {
      current: stage as unknown as Stage,
    };

    const { result } = renderHook(() => useCanvasZoom(stageRef, 1, false));

    result.current.handleResetZoom();

    expect(stage.scale).toHaveBeenLastCalledWith({ x: 1, y: 1 });
    expect(stage.position).toHaveBeenLastCalledWith({ x: 0, y: 0 });
  });

  it("respects the touch max zoom for button zooming", () => {
    const matchMediaSpy = jest
      .spyOn(window, "matchMedia")
      .mockReturnValue({ matches: true } as MediaQueryList);

    const stage = createStageMock(7, { x: 0, y: 0 });
    const stageRef: RefObject<Stage | null> = {
      current: stage as unknown as Stage,
    };

    const { result } = renderHook(() => useCanvasZoom(stageRef, 1, false));

    result.current.handleZoomIn();

    expect(stage.scale).toHaveBeenLastCalledWith({ x: 8, y: 8 });

    matchMediaSpy.mockRestore();
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

  it("zooms in at the same rate on a phone-sized base scale", () => {
    const stage = createStageMock(0.15, { x: 0, y: 0 });
    const stageRef: RefObject<Stage | null> = {
      current: stage as unknown as Stage,
    };

    const { result } = renderHook(() => useCanvasZoom(stageRef, 0.15, false));

    const startEvent = {
      evt: {
        touches: [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 100 },
        ],
        preventDefault: jest.fn(),
      },
      target: {},
    } as unknown as KonvaEventObject<TouchEvent>;

    result.current.handleTouchStart(startEvent);

    const moveEvent = {
      evt: {
        touches: [
          { clientX: 50, clientY: 100 },
          { clientX: 250, clientY: 100 },
        ],
        preventDefault: jest.fn(),
      },
      target: {},
    } as unknown as KonvaEventObject<TouchEvent>;

    result.current.handleTouchMove(moveEvent);

    const scaleCalls = stage.scale.mock.calls;
    const scaleCall = scaleCalls[scaleCalls.length - 1]?.[0];
    expect(scaleCall?.x).toBeCloseTo(0.3, 5);
    expect(scaleCall?.y).toBeCloseTo(0.3, 5);

    const positionCalls = stage.position.mock.calls;
    const positionCall = positionCalls[positionCalls.length - 1]?.[0];
    expect(positionCall?.x).toBeCloseTo(-150, 5);
    expect(positionCall?.y).toBeCloseTo(-100, 5);
  });
});
