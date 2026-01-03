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
        { size: 2, color: "#000", isDashed: false, isArrowHead: false },
        { size: 5, mode: "pixel" },
        [],
        jest.fn(),
        setCurrentStroke
      )
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
      })
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
        { size: 2, color: "#000", isDashed: false, isArrowHead: false },
        { size: 5, mode: "line" },
        drawLines,
        setDrawLines,
        jest.fn()
      )
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
        { size: 2, color: "#111", isDashed: false, isArrowHead: false },
        { size: 3, mode: "pixel" },
        [],
        setDrawLines,
        setCurrentStroke
      )
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
});
