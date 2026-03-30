import { renderHook, act, waitFor } from "@testing-library/react";
import { useImageTransform } from "@/hooks/canvas/use-image-transform";
import { useCanvas } from "@/contexts/canvas-context";
import { useCollaborativeCanvas } from "@/hooks/use-collaborative-canvas";
import type { ImageCanvas } from "@/lib/types";

jest.mock("@/contexts/canvas-context", () => ({
  useCanvas: jest.fn(),
}));

jest.mock("@/hooks/use-collaborative-canvas", () => ({
  useCollaborativeCanvas: jest.fn(),
}));

type ImageInstanceMock = {
  onload: (() => void) | null;
  onerror: (() => void) | null;
  src: string;
};

describe("useImageTransform", () => {
  const imageCanvas: ImageCanvas = {
    id: "img-1",
    src: "https://example.com/image.png",
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  };

  const setImagesOnCanvas = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useCanvas as jest.Mock).mockReturnValue({
      imagesOnCanvas: [imageCanvas],
      setImagesOnCanvas,
      editingTextId: null,
    });

    (useCollaborativeCanvas as jest.Mock).mockReturnValue({
      notifyImageMoved: jest.fn(),
    });
  });

  it("tracks image load status per image and updates on onload", async () => {
    const instances: Array<ImageInstanceMock> = [];

    class ImageMock {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      private _src = "";

      set src(value: string) {
        this._src = value;
        instances.push(this);
      }

      get src() {
        return this._src;
      }
    }

    (window as unknown as { Image: typeof ImageMock }).Image = ImageMock;

    const { result } = renderHook(() => useImageTransform());

    await waitFor(() => {
      expect(
        result.current.imageLoadStatusRefs.current.get(imageCanvas.id),
      ).toBe("loading");
    });

    expect(instances).toHaveLength(1);

    act(() => {
      instances[0].onload?.();
    });

    await waitFor(() => {
      expect(
        result.current.imageLoadStatusRefs.current.get(imageCanvas.id),
      ).toBe("loaded");
    });
  });
});
