"use client";

import { ReplayLoadingOverlay, ReplayPlayer } from "@/components/replay";
import { getReplaySession } from "@/lib/replay";
import type {
  ReplayLoadProgress,
  ReplayMatch,
} from "@/lib/replay/types";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export const ReplaySessionPage = () => {
  const params = useParams();
  const router = useRouter();
  const replayId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
        ? params.id[0]
        : "";

  const [match, setMatch] = useState<ReplayMatch | null>(null);
  const [progress, setProgress] = useState<ReplayLoadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadReplay = useCallback(async () => {
    if (!replayId) {
      setError("This replay link is missing an id.");
      setIsLoading(false);
      return;
    }

    setError(null);
    setProgress({ percent: 0, label: "Opening replay…" });
    setIsLoading(true);

    try {
      const session = await getReplaySession(replayId, {
        onProgress: setProgress,
      });

      if (!session) {
        setError(
          "This replay has expired. Reopen the .vrf file to parse it again — parsed replays are kept on this device, and the server copy only lasts a short time.",
        );
        return;
      }

      setMatch(session);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not open this replay.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [replayId]);

  useEffect(() => {
    void loadReplay();
  }, [loadReplay]);

  if (match) {
    return <ReplayPlayer match={match} replayId={replayId} />;
  }

  if (isLoading || error) {
    return (
      <ReplayLoadingOverlay
        progress={progress}
        error={error}
        onRetry={loadReplay}
        onBack={() => router.push("/replay")}
      />
    );
  }

  return null;
};
