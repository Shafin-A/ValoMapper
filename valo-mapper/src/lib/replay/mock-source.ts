import { buildReplayMatchFromSeed } from "./frames";
import { MOCK_REPLAY_SEED } from "./mock-seed";
import type {
  ReplayDataSource,
  ReplayLoadOptions,
  ReplayMatch,
} from "./types";

const MAX_REPLAY_FILE_BYTES = 250 * 1024 * 1024;

const delay = (durationMs: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, durationMs);
  });

const throwIfAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) {
    throw new DOMException("Replay loading was cancelled", "AbortError");
  }
};

const buildMockReplay = () => buildReplayMatchFromSeed(MOCK_REPLAY_SEED);

let cachedDemoReplay: ReplayMatch | null = null;

const getDemoReplay = () => {
  if (!cachedDemoReplay) {
    cachedDemoReplay = buildMockReplay();
  }

  return cachedDemoReplay;
};

const reportProgress = (
  options: ReplayLoadOptions | undefined,
  percent: number,
  label: string,
) => {
  options?.onProgress?.({ percent, label });
};

export const validateReplayFile = (file: File) => {
  const fileName = file.name.toLowerCase();

  if (!fileName.endsWith(".vrf")) {
    throw new Error(
      "That file is not a VALORANT replay. Choose a .vrf file exported by the game.",
    );
  }

  if (file.size > MAX_REPLAY_FILE_BYTES) {
    throw new Error("That replay is larger than 250 MB.");
  }
};

export class MockReplayDataSource implements ReplayDataSource {
  async load(file: File, options?: ReplayLoadOptions): Promise<ReplayMatch> {
    validateReplayFile(file);
    return this.build(options);
  }

  async loadDemo(options?: ReplayLoadOptions): Promise<ReplayMatch> {
    return this.build(options);
  }

  private async build(options?: ReplayLoadOptions): Promise<ReplayMatch> {
    reportProgress(options, 8, "Validating replay…");
    await delay(90);
    throwIfAborted(options?.signal);

    reportProgress(options, 32, "Reading replay header…");
    await delay(110);
    throwIfAborted(options?.signal);

    reportProgress(options, 58, "Decoding rounds…");
    await delay(120);
    throwIfAborted(options?.signal);

    reportProgress(options, 82, "Building playback frames…");
    const replay = getDemoReplay();
    await delay(90);
    throwIfAborted(options?.signal);

    reportProgress(options, 100, "Ready");
    return replay;
  }
}
