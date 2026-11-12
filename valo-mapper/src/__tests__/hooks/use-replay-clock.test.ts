import { useReplayClockStep, useReplayClockTime } from "@/hooks/use-replay-clock";
import { createReplayClock } from "@/lib/replay/clock";
import { act, renderHook } from "@testing-library/react";

describe("replay clock", () => {
  it("notifies subscribers only when the time changes", () => {
    const clock = createReplayClock(0);
    const listener = jest.fn();
    const unsubscribe = clock.subscribe(listener);

    clock.setTime(500);
    expect(listener).toHaveBeenCalledTimes(1);

    clock.setTime(500);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    clock.setTime(1_000);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("exposes raw and stepped snapshots", () => {
    const clock = createReplayClock(120);
    const { result } = renderHook(() => ({
      raw: useReplayClockTime(clock),
      stepped: useReplayClockStep(clock, 250),
    }));

    expect(result.current.raw).toBe(120);
    expect(result.current.stepped).toBe(0);

    act(() => clock.setTime(260));
    expect(result.current.raw).toBe(260);
    expect(result.current.stepped).toBe(250);
  });
});
