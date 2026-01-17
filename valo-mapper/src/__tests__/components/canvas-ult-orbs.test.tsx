import { render } from "@testing-library/react";
import { CanvasUltOrbs } from "@/components/canvas/canvas-ult-orbs";
import { useCanvas } from "@/contexts/canvas-context";
import { getMapUltOrbs } from "@/lib/consts";

jest.mock("@/contexts/canvas-context");
jest.mock("@/lib/consts", () => ({
  ...jest.requireActual("@/lib/consts"),
  getMapUltOrbs: jest.fn(),
}));

const mockUseCanvas = jest.mocked(useCanvas);
const mockGetMapUltOrbs = jest.mocked(getMapUltOrbs);

describe("CanvasUltOrbs", () => {
  const mockUltOrbData = {
    orbs: [
      { x: 205, y: 517 },
      { x: 805, y: 645 },
    ],
  };

  const defaultCanvasMock = {
    selectedMap: { id: "ascent", text: "Ascent", textColor: "text-white" },
    mapSide: "defense" as const,
    showUltOrbs: true,
    isMapTransitioning: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCanvas.mockReturnValue(
      defaultCanvasMock as unknown as ReturnType<typeof useCanvas>,
    );
    mockGetMapUltOrbs.mockReturnValue(mockUltOrbData);
  });

  describe("Visibility", () => {
    it("should render ult orbs when showUltOrbs is true", () => {
      const { container } = render(
        <CanvasUltOrbs mapPosition={{ x: 0, y: 0 }} />,
      );

      const group = container.querySelector('[data-testid="konva-group"]');
      expect(group).toBeInTheDocument();
    });

    it("should not render when showUltOrbs is false", () => {
      mockUseCanvas.mockReturnValue({
        ...defaultCanvasMock,
        showUltOrbs: false,
      } as unknown as ReturnType<typeof useCanvas>);

      const { container } = render(
        <CanvasUltOrbs mapPosition={{ x: 0, y: 0 }} />,
      );

      const group = container.querySelector('[data-testid="konva-group"]');
      expect(group).not.toBeInTheDocument();
    });

    it("should not render during map transition", () => {
      mockUseCanvas.mockReturnValue({
        ...defaultCanvasMock,
        isMapTransitioning: true,
      } as unknown as ReturnType<typeof useCanvas>);

      const { container } = render(
        <CanvasUltOrbs mapPosition={{ x: 0, y: 0 }} />,
      );

      const group = container.querySelector('[data-testid="konva-group"]');
      expect(group).not.toBeInTheDocument();
    });

    it("should not render when no ult orb data exists for map", () => {
      mockGetMapUltOrbs.mockReturnValue(undefined);

      const { container } = render(
        <CanvasUltOrbs mapPosition={{ x: 0, y: 0 }} />,
      );

      const group = container.querySelector('[data-testid="konva-group"]');
      expect(group).not.toBeInTheDocument();
    });
  });

  describe("Orb Rendering", () => {
    it("should render correct number of ult orbs", () => {
      const { container } = render(
        <CanvasUltOrbs mapPosition={{ x: 0, y: 0 }} />,
      );

      const groups = container.querySelectorAll('[data-testid="konva-group"]');
      // 1 parent group + 2 orb groups
      expect(groups.length).toBe(3);
    });

    it("should render orbs with circles", () => {
      const { container } = render(
        <CanvasUltOrbs mapPosition={{ x: 0, y: 0 }} />,
      );

      const circles = container.querySelectorAll(
        '[data-testid="konva-circle"]',
      );
      // Each orb has 2 circles (outer black, inner white)
      expect(circles.length).toBe(4);
    });
  });

  describe("Map Side Handling", () => {
    it("should handle defense side positioning", () => {
      const { container } = render(
        <CanvasUltOrbs mapPosition={{ x: 0, y: 0 }} />,
      );

      const group = container.querySelector('[data-testid="konva-group"]');
      expect(group).toBeInTheDocument();
    });

    it("should handle attack side positioning", () => {
      mockUseCanvas.mockReturnValue({
        ...defaultCanvasMock,
        mapSide: "attack" as const,
      } as unknown as ReturnType<typeof useCanvas>);

      const { container } = render(
        <CanvasUltOrbs mapPosition={{ x: 0, y: 0 }} />,
      );

      const group = container.querySelector('[data-testid="konva-group"]');
      expect(group).toBeInTheDocument();
    });
  });

  describe("Transition Behavior", () => {
    it("should hide immediately when transition starts", () => {
      const { container, rerender } = render(
        <CanvasUltOrbs mapPosition={{ x: 0, y: 0 }} />,
      );

      let group = container.querySelector('[data-testid="konva-group"]');
      expect(group).toBeInTheDocument();

      mockUseCanvas.mockReturnValue({
        ...defaultCanvasMock,
        isMapTransitioning: true,
      } as unknown as ReturnType<typeof useCanvas>);

      rerender(<CanvasUltOrbs mapPosition={{ x: 0, y: 0 }} />);

      group = container.querySelector('[data-testid="konva-group"]');
      expect(group).not.toBeInTheDocument();
    });

    it("should reappear after transition ends", () => {
      mockUseCanvas.mockReturnValue({
        ...defaultCanvasMock,
        isMapTransitioning: true,
      } as unknown as ReturnType<typeof useCanvas>);

      const { container, rerender } = render(
        <CanvasUltOrbs mapPosition={{ x: 0, y: 0 }} />,
      );

      let group = container.querySelector('[data-testid="konva-group"]');
      expect(group).not.toBeInTheDocument();

      mockUseCanvas.mockReturnValue({
        ...defaultCanvasMock,
        isMapTransitioning: false,
      } as unknown as ReturnType<typeof useCanvas>);

      rerender(<CanvasUltOrbs mapPosition={{ x: 0, y: 0 }} />);

      group = container.querySelector('[data-testid="konva-group"]');
      expect(group).toBeInTheDocument();
    });
  });

  describe("Different Maps", () => {
    it("should handle maps with different number of orbs", () => {
      const havenUltOrbData = {
        orbs: [
          { x: 45, y: 422 },
          { x: 922, y: 251 },
        ],
      };

      mockGetMapUltOrbs.mockReturnValue(havenUltOrbData);
      mockUseCanvas.mockReturnValue({
        ...defaultCanvasMock,
        selectedMap: { id: "haven", text: "Haven", textColor: "text-white" },
      } as unknown as ReturnType<typeof useCanvas>);

      const { container } = render(
        <CanvasUltOrbs mapPosition={{ x: 0, y: 0 }} />,
      );

      const circles = container.querySelectorAll(
        '[data-testid="konva-circle"]',
      );
      expect(circles.length).toBe(4); // 2 orbs × 2 circles each
    });

    it("should handle maps with single orb", () => {
      const singleOrbData = {
        orbs: [{ x: 500, y: 500 }],
      };

      mockGetMapUltOrbs.mockReturnValue(singleOrbData);

      const { container } = render(
        <CanvasUltOrbs mapPosition={{ x: 0, y: 0 }} />,
      );

      const circles = container.querySelectorAll(
        '[data-testid="konva-circle"]',
      );
      expect(circles.length).toBe(2); // 1 orb × 2 circles
    });
  });
});
