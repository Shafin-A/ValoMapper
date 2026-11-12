import { act, renderHook, waitFor } from "@testing-library/react";
import { useCanvasUiState } from "@/hooks/canvas/use-canvas-ui-state";
import { getCanvasBackgroundStorageKey } from "@/lib/canvas-background";

describe("useCanvasUiState canvas background", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("defaults to none when nothing is stored", async () => {
    const { result } = renderHook(() => useCanvasUiState({ lobbyCode: "AAAA" }));

    await waitFor(() => {
      expect(result.current.canvasBackground).toBe("none");
    });
  });

  it("loads a stored background for the current lobby", async () => {
    window.localStorage.setItem(
      getCanvasBackgroundStorageKey("AAAA"),
      "grid",
    );

    const { result } = renderHook(() => useCanvasUiState({ lobbyCode: "AAAA" }));

    await waitFor(() => {
      expect(result.current.canvasBackground).toBe("grid");
    });
  });

  it("persists changes and keeps each lobby independent", async () => {
    const { result, rerender } = renderHook(
      ({ lobbyCode }: { lobbyCode: string }) =>
        useCanvasUiState({ lobbyCode }),
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

describe("useCanvasUiState callback stability", () => {
  it("keeps resetEdits stable across rerenders", () => {
    const { result, rerender } = renderHook(() =>
      useCanvasUiState({ lobbyCode: "ABCD" }),
    );

    const initialResetEdits = result.current.resetEdits;

    rerender();

    expect(result.current.resetEdits).toBe(initialResetEdits);
  });
});
