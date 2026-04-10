import { renderHook, act } from "@testing-library/react";
import { useCanvasDrawing } from "@/hooks/canvas/use-canvas-drawing";
import type { DrawLine } from "@/lib/types";
import {
  getNextId,
  getIntersectingLines,
  doesEraserIntersect,
} from "@/lib/utils";

jest.mock("@/lib/utils", () => {
  const actual = jest.requireActual("@/lib/utils");
  return {
    ...actual,
    getNextId: jest.fn(() => "tool-id"),
    getIntersectingLines: jest.fn(() => []),
    doesEraserIntersect: jest.fn(() => false),
  };
});

const mockGetNextId = getNextId as jest.MockedFunction<typeof getNextId>;
const mockGetIntersectingLines = getIntersectingLines as jest.MockedFunction<
  typeof getIntersectingLines
>;
const mockDoesEraserIntersect = doesEraserIntersect as jest.MockedFunction<
  typeof doesEraserIntersect
>;

describe("useCanvasDrawing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetNextId.mockReturnValue("tool-id");
    mockGetIntersectingLines.mockReturnValue([]);
    mockDoesEraserIntersect.mockReturnValue(false);
  });

  it("starts a new stroke on first draw call", () => {
    const getWorldPointerPosition = jest.fn().mockReturnValue({ x: 10, y: 20 });
    const isDrawing = { current: false };
    const setCurrentStroke = jest.fn();

    const { result } = renderHook(() =>
      useCanvasDrawing(
        getWorldPointerPosition,
        isDrawing,
        "pencil",
        {
          size: 2,
          color: "#000",
          isDashed: false,
          isArrowHead: false,
          shape: "freehand" as const,
        },
        { size: 5, mode: "pixel" },
        [],
        jest.fn(),
        setCurrentStroke,
      ),
    );

    act(() => {
      result.current.handleDrawing();
    });

    expect(isDrawing.current).toBe(true);
    expect(setCurrentStroke).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "tool-id",
        tool: "pencil",
        points: [{ x: 10, y: 20 }],
      }),
    );
  });

  it("erases intersecting lines in line mode", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ];
    const getWorldPointerPosition = jest
      .fn()
      .mockReturnValueOnce(points[0])
      .mockReturnValueOnce(points[1]);
    const isDrawing = { current: false };
    const drawLines: DrawLine[] = [
      {
        id: "a",
        tool: "pencil",
        points,
        color: "#000",
        size: 2,
        isDashed: false,
        isArrowHead: false,
      },
      {
        id: "b",
        tool: "pencil",
        points,
        color: "#000",
        size: 2,
        isDashed: false,
        isArrowHead: false,
      },
    ];

    const setDrawLines = jest.fn((updater) => {
      if (typeof updater === "function") {
        updater(drawLines);
      }
    });

    mockGetIntersectingLines.mockReturnValue([1]);

    const { result } = renderHook(() =>
      useCanvasDrawing(
        getWorldPointerPosition,
        isDrawing,
        "eraser",
        {
          size: 2,
          color: "#000",
          isDashed: false,
          isArrowHead: false,
          shape: "freehand" as const,
        },
        { size: 5, mode: "line" },
        drawLines,
        setDrawLines,
        jest.fn(),
      ),
    );

    act(() => {
      result.current.handleDrawing();
      result.current.handleDrawing();
    });

    expect(setDrawLines).toHaveBeenCalledTimes(1);
    const updateArg = (
      setDrawLines.mock.calls[0][0] as (prev: DrawLine[]) => DrawLine[]
    )(drawLines);
    expect(updateArg).toHaveLength(1);
    expect(updateArg[0].id).toBe("a");
  });

  it("continues erasing in line mode after line indices shift", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 20 },
    ];

    const getWorldPointerPosition = jest
      .fn()
      .mockReturnValueOnce(points[0])
      .mockReturnValueOnce(points[1])
      .mockReturnValueOnce(points[2]);

    const isDrawing = { current: false };

    let latestDrawLines: DrawLine[] = [
      {
        id: "a",
        tool: "pencil",
        points,
        color: "#000",
        size: 2,
        isDashed: false,
        isArrowHead: false,
      },
      {
        id: "b",
        tool: "pencil",
        points,
        color: "#000",
        size: 2,
        isDashed: false,
        isArrowHead: false,
      },
    ];

    const setDrawLines = jest.fn((updater) => {
      if (typeof updater === "function") {
        latestDrawLines = updater(latestDrawLines);
      }
    });

    // First erase removes line "a" at index 0. After rerender, line "b" also
    // becomes index 0 and should still be removable in the same erase stroke.
    mockGetIntersectingLines.mockReturnValue([0]);

    const { result, rerender } = renderHook(() =>
      useCanvasDrawing(
        getWorldPointerPosition,
        isDrawing,
        "eraser",
        {
          size: 2,
          color: "#000",
          isDashed: false,
          isArrowHead: false,
          shape: "freehand" as const,
        },
        { size: 5, mode: "line" },
        latestDrawLines,
        setDrawLines,
        jest.fn(),
      ),
    );

    act(() => {
      result.current.handleDrawing();
      result.current.handleDrawing();
    });

    expect(latestDrawLines.map((line) => line.id)).toEqual(["b"]);

    rerender();

    act(() => {
      result.current.handleDrawing();
    });

    expect(latestDrawLines).toHaveLength(0);
    expect(setDrawLines).toHaveBeenCalledTimes(2);
  });

  it("adds a stroke on mouse up when eraser pixel intersects", () => {
    const getWorldPointerPosition = jest.fn().mockReturnValue({ x: 0, y: 0 });
    const isDrawing = { current: false };
    const setDrawLines = jest.fn();
    const setCurrentStroke = jest.fn();

    mockDoesEraserIntersect.mockReturnValue(true);

    const { result } = renderHook(() =>
      useCanvasDrawing(
        getWorldPointerPosition,
        isDrawing,
        "eraser",
        {
          size: 2,
          color: "#111",
          isDashed: false,
          isArrowHead: false,
          shape: "freehand" as const,
        },
        { size: 3, mode: "pixel" },
        [],
        setDrawLines,
        setCurrentStroke,
      ),
    );

    act(() => {
      result.current.handleDrawing();
      result.current.handleMouseUp();
    });

    expect(setDrawLines).toHaveBeenCalledWith(expect.any(Function));
    const updateArg = (
      setDrawLines.mock.calls[0][0] as (prev: DrawLine[]) => DrawLine[]
    )([]);
    expect(updateArg).toHaveLength(1);
    expect(updateArg[0]).toMatchObject({
      tool: "eraser",
      size: 3,
      color: "#111",
    });
    expect(setCurrentStroke).toHaveBeenLastCalledWith(null);
    expect(isDrawing.current).toBe(false);
  });

  it("creates a straight line with exactly two points on mouse up", () => {
    const positions = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 20 },
      { x: 30, y: 30 },
    ];
    const getWorldPointerPosition = jest
      .fn()
      .mockReturnValueOnce(positions[0])
      .mockReturnValueOnce(positions[1])
      .mockReturnValueOnce(positions[2])
      .mockReturnValueOnce(positions[3]);

    const isDrawing = { current: false };
    const setDrawLines = jest.fn();
    const setCurrentStroke = jest.fn();

    const { result } = renderHook(() =>
      useCanvasDrawing(
        getWorldPointerPosition,
        isDrawing,
        "pencil",
        {
          size: 2,
          color: "#000",
          isDashed: false,
          isArrowHead: false,
          shape: "straight" as const,
        },
        { size: 5, mode: "pixel" },
        [],
        setDrawLines,
        setCurrentStroke,
      ),
    );

    act(() => {
      result.current.handleDrawing();
      result.current.handleDrawing();
      result.current.handleDrawing();
      result.current.handleDrawing();
      result.current.handleMouseUp();
    });

    expect(setDrawLines).toHaveBeenCalledWith(expect.any(Function));
    const updateArg = (
      setDrawLines.mock.calls[0][0] as (prev: DrawLine[]) => DrawLine[]
    )([]);
    expect(updateArg).toHaveLength(1);
    expect(updateArg[0].points).toHaveLength(2);
    expect(updateArg[0].points[0]).toEqual(positions[0]);
    expect(updateArg[0].points[1]).toEqual(positions[3]);
    expect(updateArg[0].shape).toBe("straight");
  });

  it("creates a freehand line with all buffered points on mouse up", () => {
    const positions = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 20 },
      { x: 30, y: 30 },
    ];
    const getWorldPointerPosition = jest
      .fn()
      .mockReturnValueOnce(positions[0])
      .mockReturnValueOnce(positions[1])
      .mockReturnValueOnce(positions[2])
      .mockReturnValueOnce(positions[3]);

    const isDrawing = { current: false };
    const setDrawLines = jest.fn();

    const { result } = renderHook(() =>
      useCanvasDrawing(
        getWorldPointerPosition,
        isDrawing,
        "pencil",
        {
          size: 2,
          color: "#000",
          isDashed: false,
          isArrowHead: false,
          shape: "freehand" as const,
        },
        { size: 5, mode: "pixel" },
        [],
        setDrawLines,
        jest.fn(),
      ),
    );

    act(() => {
      result.current.handleDrawing();
      result.current.handleDrawing();
      result.current.handleDrawing();
      result.current.handleDrawing();
      result.current.handleMouseUp();
    });

    expect(setDrawLines).toHaveBeenCalledWith(expect.any(Function));
    const updateArg = (
      setDrawLines.mock.calls[0][0] as (prev: DrawLine[]) => DrawLine[]
    )([]);
    expect(updateArg).toHaveLength(1);
    expect(updateArg[0].points.length).toBeGreaterThan(2);
    expect(updateArg[0].shape).toBe("freehand");
  });

  it("includes shape field in initial currentStroke for pencil", () => {
    const getWorldPointerPosition = jest.fn().mockReturnValue({ x: 5, y: 5 });
    const isDrawing = { current: false };
    const setCurrentStroke = jest.fn();

    const { result } = renderHook(() =>
      useCanvasDrawing(
        getWorldPointerPosition,
        isDrawing,
        "pencil",
        {
          size: 2,
          color: "#000",
          isDashed: false,
          isArrowHead: false,
          shape: "straight" as const,
        },
        { size: 5, mode: "pixel" },
        [],
        jest.fn(),
        setCurrentStroke,
      ),
    );

    act(() => {
      result.current.handleDrawing();
    });

    expect(setCurrentStroke).toHaveBeenCalledWith(
      expect.objectContaining({ shape: "straight" }),
    );
  });

  it("creates a rectangle with exactly two points on mouse up", () => {
    const positions = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 20 },
      { x: 30, y: 30 },
    ];
    const getWorldPointerPosition = jest
      .fn()
      .mockReturnValueOnce(positions[0])
      .mockReturnValueOnce(positions[1])
      .mockReturnValueOnce(positions[2])
      .mockReturnValueOnce(positions[3]);

    const isDrawing = { current: false };
    const setDrawLines = jest.fn();
    const setCurrentStroke = jest.fn();

    const { result } = renderHook(() =>
      useCanvasDrawing(
        getWorldPointerPosition,
        isDrawing,
        "pencil",
        {
          size: 3,
          color: "#f00",
          isDashed: true,
          isArrowHead: false,
          shape: "rectangle" as const,
        },
        { size: 5, mode: "pixel" },
        [],
        setDrawLines,
        setCurrentStroke,
      ),
    );

    act(() => {
      result.current.handleDrawing();
      result.current.handleDrawing();
      result.current.handleDrawing();
      result.current.handleDrawing();
      result.current.handleMouseUp();
    });

    expect(setDrawLines).toHaveBeenCalledWith(expect.any(Function));
    const updateArg = (
      setDrawLines.mock.calls[0][0] as (prev: DrawLine[]) => DrawLine[]
    )([]);
    expect(updateArg).toHaveLength(1);
    expect(updateArg[0].points).toHaveLength(2);
    expect(updateArg[0].points[0]).toEqual(positions[0]);
    expect(updateArg[0].points[1]).toEqual(positions[3]);
    expect(updateArg[0].shape).toBe("rectangle");
    expect(updateArg[0].color).toBe("#f00");
    expect(updateArg[0].size).toBe(3);
    expect(updateArg[0].isDashed).toBe(true);
  });

  it("includes shape=rectangle in initial currentStroke", () => {
    const getWorldPointerPosition = jest.fn().mockReturnValue({ x: 5, y: 5 });
    const isDrawing = { current: false };
    const setCurrentStroke = jest.fn();

    const { result } = renderHook(() =>
      useCanvasDrawing(
        getWorldPointerPosition,
        isDrawing,
        "pencil",
        {
          size: 2,
          color: "#000",
          isDashed: false,
          isArrowHead: false,
          shape: "rectangle" as const,
        },
        { size: 5, mode: "pixel" },
        [],
        jest.fn(),
        setCurrentStroke,
      ),
    );

    act(() => {
      result.current.handleDrawing();
    });

    expect(setCurrentStroke).toHaveBeenCalledWith(
      expect.objectContaining({ shape: "rectangle" }),
    );
  });

  it("creates a circle with exactly two points on mouse up", () => {
    const positions = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 20 },
      { x: 60, y: 40 },
    ];
    const getWorldPointerPosition = jest
      .fn()
      .mockReturnValueOnce(positions[0])
      .mockReturnValueOnce(positions[1])
      .mockReturnValueOnce(positions[2])
      .mockReturnValueOnce(positions[3]);

    const isDrawing = { current: false };
    const setDrawLines = jest.fn();
    const setCurrentStroke = jest.fn();

    const { result } = renderHook(() =>
      useCanvasDrawing(
        getWorldPointerPosition,
        isDrawing,
        "pencil",
        {
          size: 2,
          color: "#0f0",
          isDashed: false,
          isArrowHead: false,
          shape: "circle" as const,
        },
        { size: 5, mode: "pixel" },
        [],
        setDrawLines,
        setCurrentStroke,
      ),
    );

    act(() => {
      result.current.handleDrawing();
      result.current.handleDrawing();
      result.current.handleDrawing();
      result.current.handleDrawing();
      result.current.handleMouseUp();
    });

    expect(setDrawLines).toHaveBeenCalledWith(expect.any(Function));
    const updateArg = (
      setDrawLines.mock.calls[0][0] as (prev: DrawLine[]) => DrawLine[]
    )([]);
    expect(updateArg).toHaveLength(1);
    expect(updateArg[0].points).toHaveLength(2);
    expect(updateArg[0].points[0]).toEqual(positions[0]);
    expect(updateArg[0].points[1]).toEqual(positions[3]);
    expect(updateArg[0].shape).toBe("circle");
    expect(updateArg[0].color).toBe("#0f0");
    expect(updateArg[0].size).toBe(2);
    expect(updateArg[0].isDashed).toBe(false);
  });

  it("includes shape=circle in initial currentStroke", () => {
    const getWorldPointerPosition = jest.fn().mockReturnValue({ x: 5, y: 5 });
    const isDrawing = { current: false };
    const setCurrentStroke = jest.fn();

    const { result } = renderHook(() =>
      useCanvasDrawing(
        getWorldPointerPosition,
        isDrawing,
        "pencil",
        {
          size: 2,
          color: "#000",
          isDashed: false,
          isArrowHead: false,
          shape: "circle" as const,
        },
        { size: 5, mode: "pixel" },
        [],
        jest.fn(),
        setCurrentStroke,
      ),
    );

    act(() => {
      result.current.handleDrawing();
    });

    expect(setCurrentStroke).toHaveBeenCalledWith(
      expect.objectContaining({ shape: "circle" }),
    );
  });

  it("circle ignores isArrowHead setting", () => {
    const positions = [
      { x: 0, y: 0 },
      { x: 50, y: 50 },
    ];
    const getWorldPointerPosition = jest
      .fn()
      .mockReturnValueOnce(positions[0])
      .mockReturnValueOnce(positions[1]);

    const isDrawing = { current: false };
    const setDrawLines = jest.fn();
    const setCurrentStroke = jest.fn();

    const { result } = renderHook(() =>
      useCanvasDrawing(
        getWorldPointerPosition,
        isDrawing,
        "pencil",
        {
          size: 4,
          color: "#f00",
          isDashed: true,
          isArrowHead: true,
          shape: "circle" as const,
        },
        { size: 5, mode: "pixel" },
        [],
        setDrawLines,
        setCurrentStroke,
      ),
    );

    act(() => {
      result.current.handleDrawing();
      result.current.handleDrawing();
      result.current.handleMouseUp();
    });

    const updateArg = (
      setDrawLines.mock.calls[0][0] as (prev: DrawLine[]) => DrawLine[]
    )([]);
    expect(updateArg[0].shape).toBe("circle");
    expect(updateArg[0].isDashed).toBe(true);
    expect(updateArg[0].size).toBe(4);
  });
});
