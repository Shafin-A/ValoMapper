"use client";

import { SiteHeader } from "@/components/layout/site-header";
import { ReplayFileDropzone } from "@/components/replay/replay-file-dropzone";
import { ReplayLoadingOverlay } from "@/components/replay/replay-loading-overlay";
import { Button } from "@/components/ui/button";
import { useSidebarState } from "@/hooks/use-sidebar-state";
import {
  DEMO_REPLAY_ID,
  saveReplaySession,
} from "@/lib/replay/session-store";
import type {
  ReplayLoadOptions,
  ReplayLoadProgress,
  ReplayMatch,
} from "@/lib/replay/types";
import { getReplayDataSource } from "@/lib/replay/vrf-source";
import { ArrowLeft, PlayCircle } from "lucide-react";import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type ReplayLoader = (options: ReplayLoadOptions) => Promise<ReplayMatch>;

export const ReplayEntryPage = () => {
  const router = useRouter();
  const sidebarState = useSidebarState();
  const abortRef = useRef<AbortController | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<ReplayLoadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  const loadReplay = useCallback(
    async (loader: ReplayLoader, fixedReplayId?: string) => {
      abortRef.current?.abort();

      const controller = new AbortController();
      abortRef.current = controller;

      setError(null);
      setProgress({ percent: 0, label: "Preparing replay…" });
      setIsLoading(true);

      try {
        const match = await loader({
          onProgress: setProgress,
          signal: controller.signal,
        });

        if (controller.signal.aborted) {
          return;
        }

        const replayId = await saveReplaySession(match, fixedReplayId);
        router.push(`/replay/${replayId}`);
      } catch (loadError) {
        if (
          controller.signal.aborted ||
          (loadError instanceof DOMException &&
            loadError.name === "AbortError")
        ) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not open that replay.",
        );
        setIsLoading(false);
      }
    },
    [router],
  );

  const handleFileSelected = useCallback(
    (file: File) => {
      const dataSource = getReplayDataSource();
      void loadReplay((options) => dataSource.load(file, options));
    },
    [loadReplay],
  );

  const handleLoadDemo = useCallback(() => {
    const dataSource = getReplayDataSource();
    void loadReplay(
      (options) => dataSource.loadDemo!(options),
      DEMO_REPLAY_ID,
    );
  }, [loadReplay]);

  const handleDismissError = useCallback(() => {
    setError(null);
    setProgress(null);
    setIsLoading(false);
  }, []);

  const handleGoBack = useCallback(() => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  }, [router]);

  return (
    <div className="[--header-height:calc(--spacing(14)_+_env(safe-area-inset-top))] min-h-screen">
      <SiteHeader {...sidebarState} showSidebarToggles={false} />

      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 md:py-16">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleGoBack}
          className="-mb-4 -ml-2 self-start text-white/60 hover:text-white"
        >
          <ArrowLeft />
          Back
        </Button>

        <div className="space-y-3 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            <PlayCircle className="h-3.5 w-3.5" />
            Replay
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
            Play a round back in real time
          </h1>
          <p className="mx-auto max-w-xl text-sm text-white/70 md:text-base">
            Drop a VALORANT replay file to watch every player move, fight, and
            plant the spike on the map. Draw over the action and copy any moment
            into a normal ValoMapper lobby.
          </p>
        </div>

        <ReplayFileDropzone
          onFileSelected={handleFileSelected}
          disabled={isLoading}
        />

        <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
          <span className="h-px flex-1 bg-primary/60" />
          or
          <span className="h-px flex-1 bg-primary/60" />
        </div>

        <div className="flex flex-col items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleLoadDemo}
            disabled={isLoading}
          >
            <PlayCircle className="mr-2 h-4 w-4" />
            Try the demo replay
          </Button>
          <p className="text-xs text-white/70">
            Replays stay in this tab. No account required.
          </p>
        </div>
      </main>

      {(isLoading || error) && (
        <ReplayLoadingOverlay
          progress={progress}
          error={error}
          onRetry={handleDismissError}
          onBack={() => router.push("/")}
        />
      )}
    </div>
  );
};
