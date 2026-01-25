import { renderHook, act } from "@testing-library/react";
import { useIsMobile } from "@/hooks/use-mobile";

describe("useIsMobile", () => {
  const originalInnerWidth = window.innerWidth;
  let matchMediaMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    matchMediaMock = jest.fn();
    window.matchMedia = matchMediaMock;
  });

  afterEach(() => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
    jest.useRealTimers();
  });

  it("should return true for mobile viewport", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 375,
    });

    const listeners: Array<() => void> = [];
    matchMediaMock.mockReturnValue({
      matches: true,
      addEventListener: jest.fn((event: string, callback: () => void) => {
        listeners.push(callback);
      }),
      removeEventListener: jest.fn(),
    });

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("should return false for desktop viewport", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1920,
    });

    const listeners: Array<() => void> = [];
    matchMediaMock.mockReturnValue({
      matches: false,
      addEventListener: jest.fn((event: string, callback: () => void) => {
        listeners.push(callback);
      }),
      removeEventListener: jest.fn(),
    });

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("should return false at breakpoint (768px)", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 768,
    });

    const listeners: Array<() => void> = [];
    matchMediaMock.mockReturnValue({
      matches: false,
      addEventListener: jest.fn((event: string, callback: () => void) => {
        listeners.push(callback);
      }),
      removeEventListener: jest.fn(),
    });

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("should update when viewport changes from desktop to mobile", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1920,
    });

    const listeners: Array<() => void> = [];
    matchMediaMock.mockReturnValue({
      matches: false,
      addEventListener: jest.fn((event: string, callback: () => void) => {
        listeners.push(callback);
      }),
      removeEventListener: jest.fn(),
    });

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 375,
    });

    act(() => {
      listeners.forEach((listener) => listener());
    });

    expect(result.current).toBe(true);
  });

  it("should update when viewport changes from mobile to desktop", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 375,
    });

    const listeners: Array<() => void> = [];
    matchMediaMock.mockReturnValue({
      matches: true,
      addEventListener: jest.fn((event: string, callback: () => void) => {
        listeners.push(callback);
      }),
      removeEventListener: jest.fn(),
    });

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);

    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1024,
    });

    act(() => {
      listeners.forEach((listener) => listener());
    });

    expect(result.current).toBe(false);
  });

  it("should remove event listener on unmount", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1920,
    });

    const removeEventListenerMock = jest.fn();
    matchMediaMock.mockReturnValue({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: removeEventListenerMock,
    });

    const { unmount } = renderHook(() => useIsMobile());
    unmount();

    expect(removeEventListenerMock).toHaveBeenCalledTimes(1);
    expect(removeEventListenerMock).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    );
  });
});
