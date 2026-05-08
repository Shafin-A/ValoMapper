import { render } from "@testing-library/react";
import { CanvasDrawLines } from "@/components/canvas/canvas-draw-lines";
import { useCanvas } from "@/contexts/canvas-context";
import { getTraversalDurationSeconds } from "@/lib/consts";

jest.mock("@/contexts/canvas-context");

const mockUseCanvas = jest.mocked(useCanvas);

describe("CanvasDrawLines", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCanvas.mockReturnValue({
      drawLines: [],
      currentStroke: null,
    } as unknown as ReturnType<typeof useCanvas>);
  });

  it("renders a traversal time label derived from the line length", () => {
    mockUseCanvas.mockReturnValue({
      drawLines: [
        {
          id: "line-1",
          tool: "pencil",
          points: [
            { x: 10, y: 10 },
            { x: 210, y: 10 },
          ],
          color: "#ffffff",
          size: 4,
          isDashed: false,
          isArrowHead: false,
          shape: "straight",
          opacity: 1,
          traversalTime: "knife-walk",
        },
      ],
      currentStroke: null,
    } as unknown as ReturnType<typeof useCanvas>);

    const { container } = render(
      <CanvasDrawLines currentLineRef={{ current: null }} />,
    );

    const texts = container.querySelectorAll('[data-testid="konva-text"]');
    const traversalDuration = getTraversalDurationSeconds(200, "knife-walk");

    expect(texts).toHaveLength(1);
    expect(texts[0]).toHaveAttribute(
      "text",
      `${traversalDuration?.toFixed(1)}s`,
    );
  });

  it("renders the preview traversal label near the active endpoint", () => {
    mockUseCanvas.mockReturnValue({
      drawLines: [],
      currentStroke: {
        id: "line-1",
        tool: "pencil",
        points: [
          { x: 10, y: 60 },
          { x: 110, y: 60 },
        ],
        color: "#ffffff",
        size: 4,
        isDashed: false,
        isArrowHead: false,
        shape: "straight",
        opacity: 1,
        traversalTime: "knife-walk",
      },
    } as unknown as ReturnType<typeof useCanvas>);

    const { container } = render(
      <CanvasDrawLines currentLineRef={{ current: null }} />,
    );

    const text = container.querySelector('[data-testid="konva-text"]');
    const group = container.querySelector('[data-testid="konva-group"]');
    const traversalDuration = getTraversalDurationSeconds(100, "knife-walk");

    expect(text).toHaveAttribute("text", `${traversalDuration?.toFixed(1)}s`);
    expect(Number(group?.getAttribute("x"))).toBeGreaterThan(80);
    expect(Number(group?.getAttribute("y"))).toBeLessThan(60);
  });

  it("does not render a traversal time label when no option is selected", () => {
    mockUseCanvas.mockReturnValue({
      drawLines: [
        {
          id: "line-1",
          tool: "pencil",
          points: [
            { x: 10, y: 10 },
            { x: 90, y: 90 },
          ],
          color: "#ffffff",
          size: 4,
          isDashed: false,
          isArrowHead: false,
          shape: "straight",
          opacity: 1,
        },
      ],
      currentStroke: null,
    } as unknown as ReturnType<typeof useCanvas>);

    const { container } = render(
      <CanvasDrawLines currentLineRef={{ current: null }} />,
    );

    const texts = container.querySelectorAll('[data-testid="konva-text"]');
    expect(texts).toHaveLength(0);
  });

  it("does not render traversal labels for rectangle or ellipse drawings", () => {
    mockUseCanvas.mockReturnValue({
      drawLines: [
        {
          id: "rect-1",
          tool: "pencil",
          points: [
            { x: 10, y: 10 },
            { x: 90, y: 90 },
          ],
          color: "#ffffff",
          size: 4,
          isDashed: false,
          isArrowHead: false,
          shape: "rectangle",
          opacity: 1,
          traversalTime: "knife-walk",
        },
        {
          id: "circle-1",
          tool: "pencil",
          points: [
            { x: 110, y: 10 },
            { x: 190, y: 90 },
          ],
          color: "#ffffff",
          size: 4,
          isDashed: false,
          isArrowHead: false,
          shape: "circle",
          opacity: 1,
          traversalTime: "knife-walk",
        },
      ],
      currentStroke: null,
    } as unknown as ReturnType<typeof useCanvas>);

    const { container } = render(
      <CanvasDrawLines currentLineRef={{ current: null }} />,
    );

    const texts = container.querySelectorAll('[data-testid="konva-text"]');
    expect(texts).toHaveLength(0);
  });
});
