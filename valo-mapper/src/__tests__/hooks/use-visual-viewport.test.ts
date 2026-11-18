import { act, renderHook } from "@testing-library/react";
import { useVisualViewport } from "@/hooks/use-visual-viewport";

const originalVisualViewport = Object.getOwnPropertyDescriptor(
  window,
  "visualViewport",
);

const restoreVisualViewport = () => {
  if (originalVisualViewport) {
    Object.defineProperty(window, "visualViewport", originalVisualViewport);
  } else {
    delete (window as { visualViewport?: unknown }).visualViewport;
  }
};

describe("useVisualViewport", () => {
  const originalInnerHeight = window.innerHeight;

  afterEach(() => {
    restoreVisualViewport();
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      writable: true,
      value: originalInnerHeight,
    });
  });

  it("falls back to window.innerHeight without a visual viewport", () => {
    delete (window as { visualViewport?: unknown }).visualViewport;
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      writable: true,
      value: 640,
    });

    const { result } = renderHook(() => useVisualViewport());

    expect(result.current).toEqual({ top: 0, height: 640 });
  });

  it("tracks window resizes without a visual viewport", () => {
    delete (window as { visualViewport?: unknown }).visualViewport;
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      writable: true,
      value: 640,
    });

    const { result } = renderHook(() => useVisualViewport());

    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      writable: true,
      value: 500,
    });
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });

    expect(result.current).toEqual({ top: 0, height: 500 });
  });

  it("reads the visual viewport offset and height", () => {
    const viewport = {
      offsetTop: 24,
      height: 720,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: viewport,
    });

    const { result } = renderHook(() => useVisualViewport());

    expect(result.current).toEqual({ top: 24, height: 720 });
  });

  it("updates on viewport resize and scroll, and cleans up listeners", () => {
    const viewport = {
      offsetTop: 0,
      height: 800,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: viewport,
    });

    const { result, unmount } = renderHook(() => useVisualViewport());

    viewport.offsetTop = 40;
    viewport.height = 600;
    act(() => {
      const resizeCallback = viewport.addEventListener.mock.calls.find(
        ([event]) => event === "resize",
      )?.[1] as () => void;
      resizeCallback();
    });

    expect(result.current).toEqual({ top: 40, height: 600 });
    expect(viewport.addEventListener).toHaveBeenCalledWith(
      "scroll",
      expect.any(Function),
    );

    unmount();

    expect(viewport.removeEventListener).toHaveBeenCalledWith(
      "resize",
      expect.any(Function),
    );
    expect(viewport.removeEventListener).toHaveBeenCalledWith(
      "scroll",
      expect.any(Function),
    );
  });
});
