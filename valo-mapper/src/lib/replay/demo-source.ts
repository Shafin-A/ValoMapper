import type {
  ReplayDataSource,
  ReplayLoadOptions,
  ReplayMatch,
} from "./types";

const MAX_REPLAY_FILE_BYTES = 250 * 1024 * 1024;
const DEMO_REPLAY_URL = "/replays/demo.json.gz";
const DEMO_DOWNLOAD_SHARE = 70;

const reportProgress = (
  options: ReplayLoadOptions | undefined,
  percent: number,
  label: string,
  indeterminate = false,
) => {
  options?.onProgress?.({
    percent,
    label,
    ...(indeterminate ? { indeterminate: true } : {}),
  });
};

const abortError = () =>
  new DOMException("Replay loading was cancelled", "AbortError");

const throwIfAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) {
    throw abortError();
  }
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

let cachedDemoReplay: ReplayMatch | null = null;

const parseDemoReplay = (payload: unknown): ReplayMatch => {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !Array.isArray((payload as ReplayMatch).rounds) ||
    !Array.isArray((payload as ReplayMatch).players)
  ) {
    throw new Error("The demo replay could not be read.");
  }

  return payload as ReplayMatch;
};

const readDemoReplay = async (
  options?: ReplayLoadOptions,
): Promise<ReplayMatch> => {
  throwIfAborted(options?.signal);
  reportProgress(options, 0, "Preparing demo replay…");

  let response: Response;
  try {
    response = await fetch(DEMO_REPLAY_URL, {
      signal: options?.signal,
      headers: { Accept: "application/gzip" },
    });
  } catch {
    if (options?.signal?.aborted) {
      throw abortError();
    }
    throw new Error("The demo replay could not be loaded.");
  }

  if (!response.ok) {
    throw new Error("The demo replay could not be loaded.");
  }

  if (!response.body || typeof DecompressionStream === "undefined") {
    throw new Error("This browser cannot decode the demo replay.");
  }

  const compressedTotal =
    Number(response.headers.get("content-length")) || 0;
  let downloaded = 0;

  const progressStream = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      downloaded += chunk.byteLength;
      if (compressedTotal > 0) {
        reportProgress(
          options,
          Math.min(
            DEMO_DOWNLOAD_SHARE,
            Math.round((downloaded / compressedTotal) * DEMO_DOWNLOAD_SHARE),
          ),
          "Downloading demo replay…",
        );
      }
      controller.enqueue(chunk);
    },
    flush() {
      reportProgress(options, DEMO_DOWNLOAD_SHARE, "Decoding demo replay…", true);
    },
  });

  let decoded: Uint8Array;
  try {
    // DecompressionStream's DOM type does not match pipeThrough's Uint8Array.
    const decompressor = new DecompressionStream(
      "gzip",
    ) as unknown as TransformStream<Uint8Array, Uint8Array>;
    const stream = response.body
      .pipeThrough(progressStream)
      .pipeThrough(decompressor);
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      chunks.push(value);
      totalBytes += value.byteLength;
    }

    decoded = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      decoded.set(chunk, offset);
      offset += chunk.byteLength;
    }
  } catch {
    if (options?.signal?.aborted) {
      throw abortError();
    }
    throw new Error("The demo replay could not be read.");
  }

  throwIfAborted(options?.signal);

  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder().decode(decoded));
  } catch {
    throw new Error("The demo replay could not be read.");
  }

  const match = parseDemoReplay(payload);
  cachedDemoReplay = match;
  reportProgress(options, 100, "Ready");
  return match;
};

const loadDemoReplay = async (
  options?: ReplayLoadOptions,
): Promise<ReplayMatch> => {
  throwIfAborted(options?.signal);

  if (cachedDemoReplay) {
    reportProgress(options, 100, "Ready");
    return cachedDemoReplay;
  }

  return readDemoReplay(options);
};

/** Loads the baked demo replay asset. */
export class DemoReplayDataSource implements ReplayDataSource {
  async load(file: File): Promise<ReplayMatch> {
    validateReplayFile(file);
    throw new Error("This data source only provides the built-in demo replay.");
  }

  async loadDemo(options?: ReplayLoadOptions): Promise<ReplayMatch> {
    return loadDemoReplay(options);
  }
}
