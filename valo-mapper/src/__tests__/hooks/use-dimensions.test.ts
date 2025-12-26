import { renderHook } from "@testing-library/react";
import { useDimensions } from "@/hooks/use-dimensions";
import { useRef } from "react";

describe("useDimensions", () => {
  let mockElement: HTMLElement;

  beforeEach(() => {
    mockElement = document.createElement("div");
    Object.defineProperty(mockElement, "offsetWidth", {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(mockElement, "offsetHeight", {
      configurable: true,
      value: 600,
    });
  });

  it("should return initial dimensions", () => {
    const { result } = renderHook(() => {
      const ref = useRef<HTMLElement>(mockElement);
      return useDimensions(ref);
    });

    expect(result.current.dimensions).toEqual({
      width: 800,
      height: 600,
    });
  });

  it("should handle null ref", () => {
    const { result } = renderHook(() => {
      const ref = useRef<HTMLElement>(null);
      return useDimensions(ref);
    });

    expect(result.current.dimensions).toEqual({
      width: 5,
      height: 5,
    });
  });

  it("should track previous dimensions", () => {
    const { result } = renderHook(() => {
      const ref = useRef<HTMLElement>(mockElement);
      return useDimensions(ref);
    });

    // Initial state: both current and previous start at the same value
    expect(result.current.dimensions).toEqual({
      width: 800,
      height: 600,
    });
    expect(result.current.previousDimensions).toEqual({
      width: 5,
      height: 5,
    });
  });

  it("should update dimensions when ResizeObserver is available", () => {
    const observeMock = jest.fn();
    const disconnectMock = jest.fn();

    global.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: observeMock,
      disconnect: disconnectMock,
      unobserve: jest.fn(),
    })) as unknown as typeof ResizeObserver;

    const { unmount } = renderHook(() => {
      const ref = useRef<HTMLElement>(mockElement);
      return useDimensions(ref);
    });

    expect(observeMock).toHaveBeenCalledWith(mockElement);

    unmount();
    expect(disconnectMock).toHaveBeenCalled();
  });

  it("should fallback to window resize listener if ResizeObserver is not available", () => {
    const originalResizeObserver = global.ResizeObserver;
    (
      global as { ResizeObserver: typeof ResizeObserver | undefined }
    ).ResizeObserver = undefined;

    const addEventListenerSpy = jest.spyOn(window, "addEventListener");
    const removeEventListenerSpy = jest.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() => {
      const ref = useRef<HTMLElement>(mockElement);
      return useDimensions(ref);
    });

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "resize",
      expect.any(Function)
    );

    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "resize",
      expect.any(Function)
    );

    global.ResizeObserver = originalResizeObserver;
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });
});
