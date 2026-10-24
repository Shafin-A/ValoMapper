import { renderHook } from "@testing-library/react";
import {
  createIconContourCanvas,
  getIconContourOffsets,
} from "@/lib/icon-contour";
import { useIconContour } from "@/hooks/use-icon-contour";

describe("icon-contour", () => {
  const createSourceImage = (width: number, height: number) => {
    const image = document.createElement("img");

    Object.defineProperty(image, "naturalWidth", { value: width });
    Object.defineProperty(image, "naturalHeight", { value: height });

    return image;
  };

  const fakeImage = createSourceImage(100, 50);

  it("spreads contour offsets evenly around a circle", () => {
    const offsets = getIconContourOffsets(4, 8);

    expect(offsets).toHaveLength(8);
    offsets.forEach(({ x, y }) => {
      expect(Math.hypot(x, y)).toBeCloseTo(4);
    });
  });

  it("renders a padded canvas around the source image", () => {
    const contour = createIconContourCanvas(fakeImage, 100, 50, {
      color: "#000000",
      thickness: 3,
    });

    expect(contour).not.toBeNull();
    expect(contour?.padding).toBe(3);
    expect(contour?.canvas.width).toBe(106);
    expect(contour?.canvas.height).toBe(56);
  });

  it("skips rendering for invalid input", () => {
    expect(
      createIconContourCanvas(fakeImage, 0, 50, {
        color: "#000000",
        thickness: 3,
      }),
    ).toBeNull();

    expect(
      createIconContourCanvas(fakeImage, 100, 50, {
        color: "#000000",
        thickness: 0,
      }),
    ).toBeNull();
  });

  it("maps the source canvas onto the rendered icon size", () => {
    const { result } = renderHook(() =>
      useIconContour({
        image: fakeImage,
        color: "#000000",
        thickness: 2,
        width: 50,
        height: 25,
      }),
    );

    expect(result.current).not.toBeNull();
    expect(result.current?.width).toBe(54);
    expect(result.current?.height).toBe(29);
    expect(result.current?.x).toBe(-2);
    expect(result.current?.y).toBe(-2);
  });

  it("returns null when the contour is disabled", () => {
    const { result } = renderHook(() =>
      useIconContour({
        image: fakeImage,
        color: "#000000",
        thickness: 0,
        width: 50,
        height: 25,
      }),
    );

    expect(result.current).toBeNull();
  });
});
