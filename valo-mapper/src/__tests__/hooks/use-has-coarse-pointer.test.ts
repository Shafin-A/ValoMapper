import { act, renderHook } from "@testing-library/react";
import { useHasCoarsePointer } from "@/hooks/use-has-coarse-pointer";

describe("useHasCoarsePointer", () => {
  let listeners: Array<(event: { matches: boolean }) => void>;

  const mockMatchMedia = (matches: boolean) => {
    listeners = [];
    const mediaQuery = {
      matches,
      addEventListener: jest.fn(
        (event: string, callback: (event: { matches: boolean }) => void) => {
          if (event === "change") listeners.push(callback);
        },
      ),
      removeEventListener: jest.fn(),
    };

    const matchMedia = jest.fn(() => mediaQuery);
    window.matchMedia = matchMedia as unknown as typeof window.matchMedia;

    return { mediaQuery, matchMedia };
  };

  it("reflects a coarse pointer media query", () => {
    mockMatchMedia(true);

    const { result } = renderHook(() => useHasCoarsePointer());

    expect(result.current).toBe(true);
  });

  it("defaults to false for fine pointers", () => {
    mockMatchMedia(false);

    const { result } = renderHook(() => useHasCoarsePointer());

    expect(result.current).toBe(false);
  });

  it("updates when the pointer type changes", () => {
    const { mediaQuery } = mockMatchMedia(false);

    const { result } = renderHook(() => useHasCoarsePointer());

    mediaQuery.matches = true;
    act(() => {
      listeners.forEach((listener) => listener({ matches: true }));
    });

    expect(result.current).toBe(true);
  });

  it("removes the change listener on unmount", () => {
    const { mediaQuery } = mockMatchMedia(false);

    const { unmount } = renderHook(() => useHasCoarsePointer());
    unmount();

    expect(mediaQuery.removeEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    );
  });
});
