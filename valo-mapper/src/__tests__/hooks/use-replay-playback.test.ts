import { useReplayPlayback } from "@/hooks/use-replay-playback";
import { act, renderHook } from "@testing-library/react";

describe("useReplayPlayback start time", () => {
  it("starts at the barrier drop instead of zero", () => {
    const { result } = renderHook(() =>
      useReplayPlayback({
        durationMs: 10_000,
        resetKey: "round-1",
        startTimeMs: 2_500,
      }),
    );

    expect(result.current.currentTimeMs).toBe(2_500);
  });

  it("resets to the barrier drop when the round changes", () => {
    const { result, rerender } = renderHook(
      ({ resetKey, startTimeMs }) =>
        useReplayPlayback({
          durationMs: 10_000,
          resetKey,
          startTimeMs,
        }),
      { initialProps: { resetKey: "round-1", startTimeMs: 2_500 } },
    );

    act(() => result.current.seek(6_000));
    expect(result.current.currentTimeMs).toBe(6_000);

    rerender({ resetKey: "round-2", startTimeMs: 1_500 });
    expect(result.current.currentTimeMs).toBe(1_500);
  });

  it("only applies a new start time when the round changes", () => {
    const { result, rerender } = renderHook(
      ({ startTimeMs }) =>
        useReplayPlayback({
          durationMs: 10_000,
          resetKey: "round-1",
          startTimeMs,
        }),
      { initialProps: { startTimeMs: 2_500 } },
    );

    act(() => result.current.seek(6_000));
    rerender({ startTimeMs: 0 });

    expect(result.current.currentTimeMs).toBe(6_000);

    act(() => result.current.seek(10_000));
    act(() => result.current.togglePlay());

    expect(result.current.currentTimeMs).toBe(2_500);
  });

  it("restarts at the barrier drop after the round ends", () => {
    const { result } = renderHook(() =>
      useReplayPlayback({
        durationMs: 10_000,
        resetKey: "round-1",
        startTimeMs: 2_500,
      }),
    );

    act(() => result.current.seek(10_000));
    act(() => result.current.togglePlay());

    expect(result.current.currentTimeMs).toBe(2_500);
    expect(result.current.isPlaying).toBe(true);
  });

  it("still allows seeking into the buy phase", () => {
    const { result } = renderHook(() =>
      useReplayPlayback({
        durationMs: 10_000,
        resetKey: "round-1",
        startTimeMs: 2_500,
      }),
    );

    act(() => result.current.seek(500));
    expect(result.current.currentTimeMs).toBe(500);
  });

  it("keeps playing when seeking with pause disabled", () => {
    const { result } = renderHook(() =>
      useReplayPlayback({
        durationMs: 10_000,
        resetKey: "round-1",
      }),
    );

    act(() => result.current.togglePlay());
    expect(result.current.isPlaying).toBe(true);

    act(() => result.current.seek(4_000, { pause: false }));

    expect(result.current.currentTimeMs).toBe(4_000);
    expect(result.current.isPlaying).toBe(true);
  });

  it("keeps playing when seeking with the keyboard", () => {
    const { result } = renderHook(() =>
      useReplayPlayback({
        durationMs: 10_000,
        resetKey: "round-1",
        startTimeMs: 2_000,
      }),
    );

    act(() => result.current.togglePlay());
    expect(result.current.isPlaying).toBe(true);

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight" }),
      );
    });

    expect(result.current.currentTimeMs).toBe(7_000);
    expect(result.current.isPlaying).toBe(true);
  });

  it("stays paused when seeking with the keyboard", () => {
    const { result } = renderHook(() =>
      useReplayPlayback({
        durationMs: 10_000,
        resetKey: "round-1",
        startTimeMs: 2_000,
      }),
    );

    expect(result.current.isPlaying).toBe(false);

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
    });

    expect(result.current.currentTimeMs).toBe(0);
    expect(result.current.isPlaying).toBe(false);
  });
});
