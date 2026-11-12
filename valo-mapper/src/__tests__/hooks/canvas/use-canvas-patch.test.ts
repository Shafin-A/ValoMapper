import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { useCanvasPatch } from "@/hooks/canvas/use-canvas-patch";
import { ApiError, apiFetch } from "@/lib/api";
import type { CanvasPatchEntry } from "@/lib/types";

jest.mock("@/lib/api", () => {
  const actual = jest.requireActual("@/lib/api");
  return { ...actual, apiFetch: jest.fn() };
});

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

const mockApiFetch = apiFetch as unknown as jest.Mock;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  return Wrapper;
};

const makeEntry = (index: number): CanvasPatchEntry => ({
  entity: "agent",
  action: "update",
  phaseIndex: 0,
  id: `agent-${index}`,
  payload: { id: `agent-${index}` },
});

const createDeferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
};

type PatchHookResult = { current: ReturnType<typeof useCanvasPatch> };

const enqueueBatch = (result: PatchHookResult, startIndex: number) => {
  for (let index = 0; index < 20; index += 1) {
    result.current.enqueueCanvasPatchEntry(makeEntry(startIndex + index));
  }
};

const getFirstEntryId = (callIndex: number): string => {
  const body = JSON.parse(
    (mockApiFetch.mock.calls[callIndex][1] as RequestInit).body as string,
  ) as { entries: CanvasPatchEntry[] };

  return body.entries[0].id ?? "";
};

describe("useCanvasPatch", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("sends patch batches one at a time, in order", async () => {
    const first = createDeferred();
    const second = createDeferred();
    mockApiFetch
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)
      .mockResolvedValue(undefined);

    const { result } = renderHook(() => useCanvasPatch("ABCD"), {
      wrapper: createWrapper(),
    });

    act(() => enqueueBatch(result, 0));
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(1));

    // A second batch fills while the first POST is still in flight.
    act(() => enqueueBatch(result, 100));
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockApiFetch).toHaveBeenCalledTimes(1);

    await act(async () => {
      first.resolve();
      await first.promise;
    });

    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(2));
    expect(getFirstEntryId(0)).toBe("agent-0");
    expect(getFirstEntryId(1)).toBe("agent-100");

    await act(async () => {
      second.resolve();
      await second.promise;
    });
  });

  it("does not retry client errors", async () => {
    mockApiFetch.mockRejectedValue(
      new ApiError("Invalid patch", 400, "Bad Request"),
    );

    const { result } = renderHook(() => useCanvasPatch("ABCD"), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      enqueueBatch(result, 0);
    });

    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(1));

    expect(result.current.hasPendingCanvasPatches()).toBe(true);
  });

  it("retries server errors with backoff", async () => {
    mockApiFetch
      .mockRejectedValueOnce(new ApiError("Server error", 500, "Error"))
      .mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useCanvasPatch("ABCD"), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      enqueueBatch(result, 0);
    });

    expect(mockApiFetch).toHaveBeenCalledTimes(1);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(300);
    });

    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(2));
    expect(result.current.hasPendingCanvasPatches()).toBe(false);
  });
});
