import { RefObject, useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { CanvasPatchEntry } from "@/lib/types";

const PATCH_BATCH_SIZE = 20;
const PATCH_DEBOUNCE_MS = 500;
const PATCH_MAX_RETRIES = 3;
const PATCH_RETRY_BASE_MS = 300;

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
  const [pending, setPending] = useState(0);

  const mutation = useMutation({
    mutationFn: (entries: CanvasPatchEntry[]) =>
      postCanvasPatchWithRetry(lobbyCode, entries),
  });

  const mutateRef = useRef(mutation.mutateAsync);
  useEffect(() => {
    mutateRef.current = mutation.mutateAsync;
  }, [mutation.mutateAsync]);

  const flushCanvasPatch = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const entries = queueRef.current;
    if (entries.length === 0) {
      return;
    }

    queueRef.current = [];
    setPending(0);

    try {
      await mutateRef.current(entries);
    } catch (error) {
      queueRef.current = [...entries, ...queueRef.current];
      setPending(queueRef.current.length);
      console.error("Canvas patch failed after retries, re-queueing", error);
      toast.error("Canvas patch update failed.");
      scheduleFlushRef.current();
    }
  }, []);

  const flushCanvasPatchRef = useRef(flushCanvasPatch);
  useEffect(() => {
    flushCanvasPatchRef.current = flushCanvasPatch;
  }, [flushCanvasPatch]);

  const scheduleFlush = useCallback(() => {
    if (timerRef.current) {
      return;
    }

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void flushCanvasPatchRef.current();
    }, PATCH_DEBOUNCE_MS);
  }, []);

  const scheduleFlushRef = useRef(scheduleFlush);
  useEffect(() => {
    scheduleFlushRef.current = scheduleFlush;
  }, [scheduleFlush]);

  const enqueueCanvasPatchEntry = useCallback(
    (entry: CanvasPatchEntry) => {
      if (!lobbyCode) {
        return;
      }

      queueRef.current.push(entry);
      setPending(queueRef.current.length);

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
    const handlePageUnload = () => {
      onBeforeUnload?.current?.();

      if (!lobbyCode || queueRef.current.length === 0) {
        return;
      }

      const entriesToSend = [...queueRef.current];
      const url = `/api/lobbies/${lobbyCode}/canvas-patches`;
      const payload = JSON.stringify({ entries: entriesToSend });
      const blob = new Blob([payload], { type: "application/json" });

      navigator.sendBeacon(url, blob);
      queueRef.current = [];
      setPending(0);
    };

    window.addEventListener("beforeunload", handlePageUnload);

    return () => {
      window.removeEventListener("beforeunload", handlePageUnload);
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
    pending,
    enqueueCanvasPatchEntry,
    flushCanvasPatch,
  };
};
