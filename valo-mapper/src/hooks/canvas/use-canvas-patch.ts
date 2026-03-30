import { useCallback, useEffect, useRef, useState } from "react";
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

export const useCanvasPatch = (lobbyCode: string) => {
  const queueRef = useRef<CanvasPatchEntry[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pending, setPending] = useState(0);

  const mutation = useMutation({
    mutationFn: (entries: CanvasPatchEntry[]) =>
      postCanvasPatchWithRetry(lobbyCode, entries),
    onError: (error) => {
      console.error("Canvas patch failed", error);
    },
  });

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
      await mutation.mutateAsync(entries);
    } catch (error) {
      queueRef.current = [...entries, ...queueRef.current];
      setPending(queueRef.current.length);
      console.error("Canvas patch failed after retries, re-queueing", error);
      toast.error("Canvas patch update failed.");
    }
  }, [mutation]);

  const scheduleFlush = useCallback(() => {
    if (timerRef.current) {
      return;
    }

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void flushCanvasPatch();
    }, PATCH_DEBOUNCE_MS);
  }, [flushCanvasPatch]);

  const enqueueCanvasPatchEntry = useCallback(
    (entry: CanvasPatchEntry) => {
      if (!lobbyCode) {
        return;
      }

      queueRef.current = [...queueRef.current, entry];
      setPending(queueRef.current.length);

      if (queueRef.current.length >= PATCH_BATCH_SIZE) {
        void flushCanvasPatch();
        return;
      }

      scheduleFlush();
    },
    [lobbyCode, flushCanvasPatch, scheduleFlush],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!lobbyCode) {
      return;
    }

    return () => {
      void flushCanvasPatch();
    };
  }, [lobbyCode, flushCanvasPatch]);

  return {
    pending,
    enqueueCanvasPatchEntry,
    flushCanvasPatch,
  };
};
