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
});
