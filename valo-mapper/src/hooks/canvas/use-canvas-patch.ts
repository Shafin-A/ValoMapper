import { RefObject, useCallback, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, apiFetch } from "@/lib/api";
import { CanvasPatchEntry } from "@/lib/types";

const PATCH_BATCH_SIZE = 20;
const PATCH_DEBOUNCE_MS = 500;
const PATCH_MAX_RETRIES = 3;
const PATCH_RETRY_BASE_MS = 300;
const PATCH_RETRY_MAX_DELAY_MS = 30_000;

// 4xx responses other than timeout/rate-limit will not succeed on retry.
const RETRYABLE_CLIENT_STATUSES = new Set([408, 429]);

const isRetryablePatchError = (error: unknown): boolean => {
  if (!(error instanceof ApiError)) {
    return true;
  }

  return error.status >= 500 || RETRYABLE_CLIENT_STATUSES.has(error.status);
};

const postCanvasPatch = async (
  lobbyCode: string,
  entries: CanvasPatchEntry[],
): Promise<void> => {
  if (!lobbyCode || entries.length === 0) {
    return;
  }

  await apiFetch(`/api/lobbies/${lobbyCode}/canvas-patches`, {
    method: "POST",
    body: JSON.stringify({ entries }),
  });
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const postCanvasPatchWithRetry = async (
  lobbyCode: string,
  entries: CanvasPatchEntry[],
): Promise<void> => {
  let attempt = 0;

  while (attempt <= PATCH_MAX_RETRIES) {
    try {
      await postCanvasPatch(lobbyCode, entries);
      return;
    } catch (error) {
      if (!isRetryablePatchError(error)) {
        throw error;
      }

      attempt += 1;
      if (attempt > PATCH_MAX_RETRIES) {
        throw error;
      }

      const backoff = PATCH_RETRY_BASE_MS * 2 ** (attempt - 1);
      await delay(backoff);
    }
  }
};

export const useCanvasPatch = (
  lobbyCode: string,
  onBeforeUnload?: RefObject<(() => void) | null>,
) => {
  const queueRef = useRef<CanvasPatchEntry[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Overlapping POSTs could commit out of order.
  const drainingRef = useRef(false);
  const failedDrainsRef = useRef(0);

  const mutation = useMutation({
    mutationFn: (entries: CanvasPatchEntry[]) =>
      postCanvasPatchWithRetry(lobbyCode, entries),
  });

  const mutateRef = useRef(mutation.mutateAsync);
  useEffect(() => {
    mutateRef.current = mutation.mutateAsync;
  }, [mutation.mutateAsync]);

  const scheduleFlushRef = useRef<(delayMs?: number) => void>(() => {});

  const drainQueue = useCallback(async () => {
    if (drainingRef.current) {
      return;
    }

    drainingRef.current = true;

    try {
      while (queueRef.current.length > 0) {
        const entries = queueRef.current;
        queueRef.current = [];

        try {
          await mutateRef.current(entries);
          failedDrainsRef.current = 0;
        } catch (error) {
          // Keep retries and later edits ordered behind the failed batch.
          queueRef.current = [...entries, ...queueRef.current];
          console.error("Canvas patch failed after retries, re-queueing", error);
          toast.error("Canvas patch update failed.");

          const backoff = Math.min(
            PATCH_DEBOUNCE_MS * 2 ** failedDrainsRef.current,
            PATCH_RETRY_MAX_DELAY_MS,
          );
          failedDrainsRef.current += 1;
          scheduleFlushRef.current(backoff);
          return;
        }
      }
    } finally {
      drainingRef.current = false;
    }
  }, []);

  const flushCanvasPatch = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    await drainQueue();
  }, [drainQueue]);

  const flushCanvasPatchRef = useRef(flushCanvasPatch);
  useEffect(() => {
    flushCanvasPatchRef.current = flushCanvasPatch;
  }, [flushCanvasPatch]);

  const scheduleFlush = useCallback((delayMs: number = PATCH_DEBOUNCE_MS) => {
    if (timerRef.current) {
      return;
    }

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void flushCanvasPatchRef.current();
    }, delayMs);
  }, []);

  useEffect(() => {
    scheduleFlushRef.current = scheduleFlush;
  }, [scheduleFlush]);

  const hasPendingCanvasPatches = useCallback(
    () => queueRef.current.length > 0 || drainingRef.current,
    [],
  );

  const enqueueCanvasPatchEntry = useCallback(
    (entry: CanvasPatchEntry) => {
      if (!lobbyCode) {
        return;
      }

      queueRef.current.push(entry);

      if (queueRef.current.length >= PATCH_BATCH_SIZE) {
        void flushCanvasPatchRef.current();
        return;
      }

      scheduleFlushRef.current();
    },
    [lobbyCode],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handlePageExit = () => {
      onBeforeUnload?.current?.();

      const entries = queueRef.current;
      if (!lobbyCode || entries.length === 0) {
        return;
      }

      queueRef.current = [];

      const url = `/api/lobbies/${lobbyCode}/canvas-patches`;
      const payload = JSON.stringify({ entries });
      const blob = new Blob([payload], { type: "application/json" });

      let beaconSent = false;
      try {
        beaconSent = navigator.sendBeacon(url, blob);
      } catch {
        beaconSent = false;
      }

      if (!beaconSent) {
        void fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    };

    // pagehide is the reliable teardown signal on iOS Safari.
    window.addEventListener("beforeunload", handlePageExit);
    window.addEventListener("pagehide", handlePageExit);

    return () => {
      window.removeEventListener("beforeunload", handlePageExit);
      window.removeEventListener("pagehide", handlePageExit);
    };
  }, [lobbyCode, onBeforeUnload]);

  useEffect(() => {
    if (!lobbyCode) {
      return;
    }

    return () => {
      void flushCanvasPatchRef.current();
    };
  }, [lobbyCode]);

  return {
    enqueueCanvasPatchEntry,
    flushCanvasPatch,
    hasPendingCanvasPatches,
  };
};
