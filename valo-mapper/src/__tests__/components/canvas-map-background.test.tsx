import { render, waitFor } from "@testing-library/react";
import { CanvasMapBackground } from "@/components/canvas/canvas-map-background";
import { useCanvas } from "@/contexts/canvas-context";
import { RefObject } from "react";
import { Stage as KonvaStage } from "konva/lib/Stage";

jest.mock("@/contexts/canvas-context");

const mockUseCanvas = jest.mocked(useCanvas);

describe("CanvasMapBackground", () => {
  const mockStageRef: RefObject<KonvaStage | null> = {
    current: {
      batchDraw: jest.fn(),
    } as unknown as KonvaStage,
  };

  const mockSetIsMapTransitioning = jest.fn();

  const defaultCanvasMock = {
    selectedMap: { id: "ascent", text: "Ascent", textColor: "text-white" },
    mapSide: "defense" as const,
    setIsMapTransitioning: mockSetIsMapTransitioning,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCanvas.mockReturnValue(
      defaultCanvasMock as unknown as ReturnType<typeof useCanvas>,
    );
  });

  describe("Initial Load", () => {
    it("should render the map image when loaded", () => {
      const { container } = render(
        <CanvasMapBackground
          mapPosition={{ x: 0, y: 0 }}
          stageRef={mockStageRef}
        />,
      );

      const images = container.querySelectorAll('[data-testid="konva-image"]');
      expect(images).toHaveLength(1);
    });

    it("should call batchDraw when image loads", () => {
      render(
        <CanvasMapBackground
          mapPosition={{ x: 0, y: 0 }}
          stageRef={mockStageRef}
        />,
      );

      expect(mockStageRef.current?.batchDraw).toHaveBeenCalled();
    });

    it("should not set transitioning on first load", () => {
      render(
        <CanvasMapBackground
          mapPosition={{ x: 0, y: 0 }}
          stageRef={mockStageRef}
        />,
      );

      expect(mockSetIsMapTransitioning).not.toHaveBeenCalledWith(true);
    });
  });

  describe("Map Transitions", () => {
    it("should set transitioning flag when map changes", async () => {
      const { rerender } = render(
        <CanvasMapBackground
          mapPosition={{ x: 0, y: 0 }}
          stageRef={mockStageRef}
        />,
      );

      mockUseCanvas.mockReturnValue({
        ...defaultCanvasMock,
        selectedMap: { id: "bind", text: "Bind", textColor: "text-white" },
      } as unknown as ReturnType<typeof useCanvas>);

      rerender(
        <CanvasMapBackground
          mapPosition={{ x: 0, y: 0 }}
          stageRef={mockStageRef}
        />,
      );

      await waitFor(() => {
        expect(mockSetIsMapTransitioning).toHaveBeenCalledWith(true);
      });
    });

    it("should render both old and new map during transition", async () => {
      const { container, rerender } = render(
        <CanvasMapBackground
          mapPosition={{ x: 0, y: 0 }}
          stageRef={mockStageRef}
        />,
      );

      mockUseCanvas.mockReturnValue({
        ...defaultCanvasMock,
        selectedMap: { id: "bind", text: "Bind", textColor: "text-white" },
      } as unknown as ReturnType<typeof useCanvas>);

      rerender(
        <CanvasMapBackground
          mapPosition={{ x: 0, y: 0 }}
          stageRef={mockStageRef}
        />,
      );

      await waitFor(() => {
        const images = container.querySelectorAll(
          '[data-testid="konva-image"]',
        );

        expect(images.length).toBe(2);
      });
    });
  });

  describe("Map Side Rotation", () => {
    it("should apply correct rotation for defense side", () => {
      const { container } = render(
        <CanvasMapBackground
          mapPosition={{ x: 0, y: 0 }}
          stageRef={mockStageRef}
        />,
      );

      const image = container.querySelector('[data-testid="konva-image"]');
      expect(image).toHaveAttribute("rotation", "0");
    });

    it("should apply correct rotation for attack side", () => {
      mockUseCanvas.mockReturnValue({
        ...defaultCanvasMock,
        mapSide: "attack" as const,
      } as unknown as ReturnType<typeof useCanvas>);

      const { container } = render(
        <CanvasMapBackground
          mapPosition={{ x: 0, y: 0 }}
          stageRef={mockStageRef}
        />,
      );

      const image = container.querySelector('[data-testid="konva-image"]');
      expect(image).toHaveAttribute("rotation", "180");
    });
  });

  describe("Image Properties", () => {
    it("should apply correct map size", () => {
      const { container } = render(
        <CanvasMapBackground
          mapPosition={{ x: 100, y: 200 }}
          stageRef={mockStageRef}
        />,
      );

      const image = container.querySelector('[data-testid="konva-image"]');
      expect(image).toHaveAttribute("width", "1000");
      expect(image).toHaveAttribute("height", "1000");
    });

    it("should position image correctly based on mapPosition", () => {
      const mapPosition = { x: 100, y: 200 };
      const { container } = render(
        <CanvasMapBackground
          mapPosition={mapPosition}
          stageRef={mockStageRef}
        />,
      );

      const image = container.querySelector('[data-testid="konva-image"]');
      // x = mapPosition.x + MAP_SIZE / 2 = 100 + 500 = 600
      expect(image).toHaveAttribute("x", "600");
      // y = mapPosition.y + MAP_SIZE / 2 = 200 + 500 = 700
      expect(image).toHaveAttribute("y", "700");
    });

    it("should have correct alt text", () => {
      const { container } = render(
        <CanvasMapBackground
          mapPosition={{ x: 0, y: 0 }}
          stageRef={mockStageRef}
        />,
      );

      const image = container.querySelector('[data-testid="konva-image"]');
      expect(image).toHaveAttribute("alt", "Ascent");
    });
  });

  describe("Error Handling", () => {
    it("should render within a group element", () => {
      const { container } = render(
        <CanvasMapBackground
          mapPosition={{ x: 0, y: 0 }}
          stageRef={mockStageRef}
        />,
      );

      const group = container.querySelector('[data-testid="konva-group"]');
      expect(group).toBeInTheDocument();
    });

    it("should handle null stage ref", () => {
      const nullStageRef: RefObject<KonvaStage | null> = { current: null };

      expect(() => {
        render(
          <CanvasMapBackground
            mapPosition={{ x: 0, y: 0 }}
            stageRef={nullStageRef}
          />,
        );
      }).not.toThrow();
    });
  });

  describe("Cleanup", () => {
    it("should not cause memory leaks on unmount", () => {
      const { unmount } = render(
        <CanvasMapBackground
          mapPosition={{ x: 0, y: 0 }}
          stageRef={mockStageRef}
        />,
      );

      expect(() => unmount()).not.toThrow();
    });

    it("should handle rapid map changes", async () => {
      const { rerender, unmount } = render(
        <CanvasMapBackground
          mapPosition={{ x: 0, y: 0 }}
          stageRef={mockStageRef}
        />,
      );

      const maps = ["bind", "haven", "split"];
      for (const mapId of maps) {
        mockUseCanvas.mockReturnValue({
          ...defaultCanvasMock,
          selectedMap: {
            id: mapId,
            text: mapId,
            textColor: "text-white",
          },
        } as unknown as ReturnType<typeof useCanvas>);

        rerender(
          <CanvasMapBackground
            mapPosition={{ x: 0, y: 0 }}
            stageRef={mockStageRef}
          />,
        );
      }

      expect(() => unmount()).not.toThrow();
    });
  });
});
