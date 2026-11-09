import { act, renderHook, waitFor } from "@testing-library/react";
import { useCanvasUI } from "@/hooks/canvas/use-canvas-ui";
import { getCanvasBackgroundStorageKey } from "@/lib/canvas-background";

describe("useCanvasUI canvas background", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("defaults to none when nothing is stored", async () => {
    const { result } = renderHook(() => useCanvasUI({ lobbyCode: "AAAA" }));

    await waitFor(() => {
      expect(result.current.canvasBackground).toBe("none");
    });
  });

  it("loads a stored background for the current lobby", async () => {
    window.localStorage.setItem(
      getCanvasBackgroundStorageKey("AAAA"),
      "grid",
    );

    const { result } = renderHook(() => useCanvasUI({ lobbyCode: "AAAA" }));

    await waitFor(() => {
      expect(result.current.canvasBackground).toBe("grid");
    });
  });

  it("persists changes and keeps each lobby independent", async () => {
    const { result, rerender } = renderHook(
      ({ lobbyCode }: { lobbyCode: string }) =>
        useCanvasUI({ lobbyCode }),
      { initialProps: { lobbyCode: "AAAA" } },
    );

    await waitFor(() => {
      expect(result.current.canvasBackground).toBe("none");
    });

    act(() => {
      result.current.setCanvasBackground("dots");
    });

    expect(result.current.canvasBackground).toBe("dots");
    expect(
      window.localStorage.getItem(getCanvasBackgroundStorageKey("AAAA")),
    ).toBe("dots");

    rerender({ lobbyCode: "BBBB" });

    await waitFor(() => {
      expect(result.current.canvasBackground).toBe("none");
    });

    act(() => {
      result.current.setCanvasBackground("grid");
    });

    expect(
      window.localStorage.getItem(getCanvasBackgroundStorageKey("BBBB")),
    ).toBe("grid");

    rerender({ lobbyCode: "AAAA" });

    await waitFor(() => {
      expect(result.current.canvasBackground).toBe("dots");
    });

    rerender({ lobbyCode: "" });

    await waitFor(() => {
      expect(result.current.canvasBackground).toBe("none");
    });
  });
});
