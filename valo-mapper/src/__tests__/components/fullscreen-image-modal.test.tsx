import { render, screen, fireEvent } from "@testing-library/react";
import { FullscreenImageModal } from "@/components/canvas/fullscreen-image-modal";

describe("FullscreenImageModal", () => {
  it("renders image and close button", () => {
    const onClose = jest.fn();

    render(<FullscreenImageModal imageSrc="/small.png" onClose={onClose} />);

    expect(
      screen.getByRole("img", { name: /fullscreen view/i }),
    ).toBeInTheDocument();
    const closeButton = screen.getByRole("button", {
      name: /close fullscreen/i,
    });
    expect(closeButton).toBeInTheDocument();

    const container = screen.getByTestId("fullscreen-container");
    const controlsOverlay = container.querySelector("div.pointer-events-none");
    expect(controlsOverlay).toBeTruthy();
    expect(controlsOverlay).toHaveClass("absolute");
    expect(controlsOverlay).toHaveClass("top-2");
    expect(controlsOverlay).toHaveClass("inset-x-2");

    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not render when imageSrc is null", () => {
    render(<FullscreenImageModal imageSrc={null} onClose={() => {}} />);

    expect(
      screen.queryByRole("img", { name: /fullscreen view/i }),
    ).not.toBeInTheDocument();
  });

  it("supports zoom controls", () => {
    render(<FullscreenImageModal imageSrc="/small.png" onClose={() => {}} />);

    const zoomIn = screen.getByTestId("zoom-in");
    const zoomOut = screen.getByTestId("zoom-out");
    const zoomReset = screen.getByTestId("zoom-reset");

    expect(zoomIn).not.toBeDisabled();
    expect(zoomOut).not.toBeDisabled();

    // Zoom in to max limit
    for (let i = 0; i < 25; i += 1) {
      fireEvent.click(zoomIn);
    }
    expect(zoomIn).toBeDisabled();

    // After reset, zoom in should be enabled again
    fireEvent.click(zoomReset);
    expect(zoomIn).not.toBeDisabled();
    expect(zoomOut).not.toBeDisabled();
  });

  it("supports wheel zoom and drag panning", () => {
    render(<FullscreenImageModal imageSrc="/small.png" onClose={() => {}} />);

    const image = screen.getByRole("img", { name: /fullscreen view/i });
    const imageWrapper = image.parentElement as HTMLElement;

    // Wheel zoom in
    fireEvent.wheel(imageWrapper, { deltaY: -100, clientX: 50, clientY: 50 });
    expect(imageWrapper.style.transform).toContain("scale(");

    // With a known container center, button zoom should also recenter around it.
    const container = screen.getByTestId("fullscreen-container");
    Object.defineProperty(container, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        x: 0,
        y: 0,
        width: 200,
        height: 200,
        top: 0,
        left: 0,
        right: 200,
        bottom: 200,
        toJSON: () => ({}),
      }),
    });

    const imageWrapper2 = screen.getByRole("img", { name: /fullscreen view/i })
      .parentElement as HTMLElement;
    const initialTransform2 = imageWrapper2.style.transform;

    fireEvent.click(screen.getByTestId("zoom-in"));
    expect(imageWrapper2.style.transform).not.toBe(initialTransform2);

    // Start pan drag at base zoom
    fireEvent.pointerDown(imageWrapper, {
      clientX: 100,
      clientY: 100,
      pointerId: 1,
    });
    fireEvent.pointerMove(imageWrapper, {
      clientX: 110,
      clientY: 105,
      pointerId: 1,
    });
    fireEvent.pointerUp(imageWrapper, {
      clientX: 110,
      clientY: 105,
      pointerId: 1,
    });

    const transformAt1x = imageWrapper.style.transform;
    expect(transformAt1x).toContain("translate(");
    expect(transformAt1x).not.toContain("translate(0px, 0px)");

    // Increase zoom and ensure pan movement is reduced (slower at higher zoom)
    fireEvent.click(screen.getByTestId("zoom-in"));

    fireEvent.pointerDown(imageWrapper, {
      clientX: 100,
      clientY: 100,
      pointerId: 2,
    });
    fireEvent.pointerMove(imageWrapper, {
      clientX: 120,
      clientY: 110,
      pointerId: 2,
    });
    fireEvent.pointerUp(imageWrapper, {
      clientX: 120,
      clientY: 110,
      pointerId: 2,
    });

    const transformAtZoomed = imageWrapper.style.transform;
    expect(transformAtZoomed).toContain("translate(");
    expect(transformAtZoomed).not.toBe(transformAt1x);
  });
});
