import { render } from "@testing-library/react";
import { CanvasCallouts } from "@/components/canvas/canvas-callouts";
import { useCanvas } from "@/contexts/canvas-context";
import { getMapCallouts } from "@/lib/consts";

jest.mock("@/contexts/canvas-context");
jest.mock("@/lib/consts", () => ({
  ...jest.requireActual("@/lib/consts"),
  getMapCallouts: jest.fn(),
}));

const mockUseCanvas = jest.mocked(useCanvas);
const mockGetMapCallouts = jest.mocked(getMapCallouts);

describe("CanvasCallouts", () => {
  const mockCalloutData = {
    xMultiplier: 1,
    yMultiplier: 1,
    xScalarToAdd: 0,
    yScalarToAdd: 0,
    rotation: 0,
    callouts: [
      {
        location: { x: 100, y: 200 },
        regionName: "Site",
        superRegionName: "A",
      },
      {
        location: { x: 300, y: 400 },
        regionName: "Site",
        superRegionName: "B",
      },
    ],
  };

  const defaultCanvasMock = {
    selectedMap: { id: "ascent", text: "Ascent", textColor: "text-white" },
    mapSide: "defense" as const,
    showCallouts: true,
    isMapTransitioning: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCanvas.mockReturnValue(
      defaultCanvasMock as unknown as ReturnType<typeof useCanvas>,
    );
    mockGetMapCallouts.mockReturnValue(mockCalloutData);
  });

  describe("Visibility", () => {
    it("should render callouts when showCallouts is true", () => {
      const { container } = render(
        <CanvasCallouts mapPosition={{ x: 0, y: 0 }} />,
      );

      const group = container.querySelector('[data-testid="konva-group"]');
      expect(group).toBeInTheDocument();
    });

    it("should not render when showCallouts is false", () => {
      mockUseCanvas.mockReturnValue({
        ...defaultCanvasMock,
        showCallouts: false,
      } as unknown as ReturnType<typeof useCanvas>);

      const { container } = render(
        <CanvasCallouts mapPosition={{ x: 0, y: 0 }} />,
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
        <CanvasCallouts mapPosition={{ x: 0, y: 0 }} />,
      );

      const group = container.querySelector('[data-testid="konva-group"]');
      expect(group).not.toBeInTheDocument();
    });

    it("should not render when no callout data exists for map", () => {
      mockGetMapCallouts.mockReturnValue(undefined);

      const { container } = render(
        <CanvasCallouts mapPosition={{ x: 0, y: 0 }} />,
      );

      const group = container.querySelector('[data-testid="konva-group"]');
      expect(group).not.toBeInTheDocument();
    });
  });

  describe("Callout Rendering", () => {
    it("should render correct number of callouts", () => {
      const { container } = render(
        <CanvasCallouts mapPosition={{ x: 0, y: 0 }} />,
      );

      const labels = container.querySelectorAll('[data-testid="konva-label"]');
      expect(labels).toHaveLength(2);
    });

    it("should render callout labels with correct text", () => {
      const { container } = render(
        <CanvasCallouts mapPosition={{ x: 0, y: 0 }} />,
      );

      const texts = container.querySelectorAll('[data-testid="konva-text"]');
      expect(texts[0]).toHaveAttribute("text", "A Site");
      expect(texts[1]).toHaveAttribute("text", "B Site");
    });
  });

  describe("Map Side Handling", () => {
    it("should handle defense side positioning", () => {
      const { container } = render(
        <CanvasCallouts mapPosition={{ x: 0, y: 0 }} />,
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
        <CanvasCallouts mapPosition={{ x: 0, y: 0 }} />,
      );

      const group = container.querySelector('[data-testid="konva-group"]');
      expect(group).toBeInTheDocument();
    });
  });

  describe("Transition Behavior", () => {
    it("should hide immediately when transition starts", () => {
      const { container, rerender } = render(
        <CanvasCallouts mapPosition={{ x: 0, y: 0 }} />,
      );

      let group = container.querySelector('[data-testid="konva-group"]');
      expect(group).toBeInTheDocument();

      mockUseCanvas.mockReturnValue({
        ...defaultCanvasMock,
        isMapTransitioning: true,
      } as unknown as ReturnType<typeof useCanvas>);

      rerender(<CanvasCallouts mapPosition={{ x: 0, y: 0 }} />);

      group = container.querySelector('[data-testid="konva-group"]');
      expect(group).not.toBeInTheDocument();
    });

    it("should reappear after transition ends", () => {
      mockUseCanvas.mockReturnValue({
        ...defaultCanvasMock,
        isMapTransitioning: true,
      } as unknown as ReturnType<typeof useCanvas>);

      const { container, rerender } = render(
        <CanvasCallouts mapPosition={{ x: 0, y: 0 }} />,
      );

      let group = container.querySelector('[data-testid="konva-group"]');
      expect(group).not.toBeInTheDocument();

      mockUseCanvas.mockReturnValue({
        ...defaultCanvasMock,
        isMapTransitioning: false,
      } as unknown as ReturnType<typeof useCanvas>);

      rerender(<CanvasCallouts mapPosition={{ x: 0, y: 0 }} />);

      group = container.querySelector('[data-testid="konva-group"]');
      expect(group).toBeInTheDocument();
    });
  });

  describe("Different Maps", () => {
    it("should handle different map callout data", () => {
      const bindCalloutData = {
        xMultiplier: 1,
        yMultiplier: 1,
        xScalarToAdd: 0,
        yScalarToAdd: 0,
        rotation: 0,
        callouts: [
          {
            location: { x: 150, y: 250 },
            regionName: "Long",
            superRegionName: "B",
          },
        ],
      };

      mockGetMapCallouts.mockReturnValue(bindCalloutData);
      mockUseCanvas.mockReturnValue({
        ...defaultCanvasMock,
        selectedMap: { id: "bind", text: "Bind", textColor: "text-white" },
      } as unknown as ReturnType<typeof useCanvas>);

      const { container } = render(
        <CanvasCallouts mapPosition={{ x: 0, y: 0 }} />,
      );

      const labels = container.querySelectorAll('[data-testid="konva-label"]');
      expect(labels).toHaveLength(1);

      const texts = container.querySelectorAll('[data-testid="konva-text"]');
      expect(texts[0]).toHaveAttribute("text", "B Long");
    });
  });
});
