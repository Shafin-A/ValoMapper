import { MockReplayDataSource, validateReplayFile } from "./mock-source";
import type {
  ReplayDataSource,
  ReplayLoadOptions,
  ReplayMatch,
} from "./types";

/** Slow uplinks: the server's own read deadline is also five minutes. */
const UPLOAD_TIMEOUT_MS = 5 * 60 * 1000;

const ERROR_MESSAGES: Record<string, string> = {
  invalid_request: "The replay upload was malformed.",
  not_a_replay: "That file is not a VALORANT replay.",
  too_large: "That replay is larger than the 250 MB limit.",
  not_found: "This replay expired. Open the .vrf file again.",
  unsupported_build:
    "This replay was recorded on a game build that is not supported yet.",
  unsupported_map: "This replay uses a map ValoMapper does not support yet.",
  unsupported_compression:
    "This replay uses a compression format we cannot decode.",
  transform_check_failed: "This replay could not be decoded reliably.",
  corrupt: "This replay file appears to be damaged.",
  missing_team_data: "The teams could not be read from this replay.",
  parse_failed: "We could not parse this replay.",
  rate_limited: "Too many replays are being parsed. Try again later.",
  parser_busy: "The replay parser is busy. Try again in a moment.",
  parser_unavailable: "Replay parsing is unavailable right now.",
  internal: "Something went wrong while opening this replay.",
};

export const getReplayApiBase = () => {
  const configured = (process.env.NEXT_PUBLIC_API_URL ?? "").trim();
  if (!configured) {
    return "";
  }
  return configured.replace(/\/+$/, "");
};

const report = (
  options: ReplayLoadOptions | undefined,
  percent: number,
  label: string,
  indeterminate = false,
) => {
  options?.onProgress?.({
    percent: Math.min(100, Math.max(0, percent)),
    label,
    ...(indeterminate ? { indeterminate: true } : {}),
  });
};

const abortError = () =>
  new DOMException("Replay loading was cancelled", "AbortError");

const parseJSON = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

type ErrorPayload = {
  error?: unknown;
  code?: unknown;
};

const friendlyError = (status: number, payload: unknown) => {
  const body =
    payload && typeof payload === "object"
      ? (payload as ErrorPayload)
      : ({} as ErrorPayload);
  const code = typeof body.code === "string" ? body.code : "";
  if (code && ERROR_MESSAGES[code]) {
    return ERROR_MESSAGES[code];
  }
  if (typeof body.error === "string" && body.error.trim() !== "") {
    return body.error;
  }
  if (status === 413) {
    return ERROR_MESSAGES.too_large;
  }
  if (status === 429) {
    return ERROR_MESSAGES.rate_limited;
  }
  if (status >= 500) {
    return ERROR_MESSAGES.parser_unavailable;
  }
  return "We could not open that replay.";
};

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Validates the envelope just enough that a malformed 200 cannot crash the
 * player. The match body itself is trusted structurally, not semantically.
 */
export const parseReplayEnvelope = (payload: unknown): ReplayMatch => {
  if (!isRecord(payload)) {
    throw new Error("The replay parser returned an invalid response.");
  }
  const match = payload.match;
  if (
    !isRecord(match) ||
    !Array.isArray(match.rounds) ||
    !Array.isArray(match.players)
  ) {
    throw new Error("The replay parser returned an invalid match.");
  }

  const replayId =
    typeof payload.replayId === "string" && payload.replayId !== ""
      ? payload.replayId
      : typeof match.replayId === "string"
        ? match.replayId
        : "";
  if (!replayId) {
    throw new Error("The replay parser did not return a replay id.");
  }

  const warnings = Array.isArray(payload.warnings)
    ? payload.warnings.filter(
        (warning): warning is string => typeof warning === "string",
      )
    : Array.isArray(match.warnings)
      ? match.warnings.filter(
          (warning): warning is string => typeof warning === "string",
        )
      : undefined;

  if (warnings && warnings.length > 0) {
    // Keep parser diagnostics out of the UI, but leave them in the browser log.
    console.warn("[replay] parser warnings", warnings);
  }

  return {
    ...(match as unknown as ReplayMatch),
    replayId,
    source: "vrf",
    warnings,
  };
};

export class VrfReplayDataSource implements ReplayDataSource {
  private readonly fallback = new MockReplayDataSource();

  load(file: File, options?: ReplayLoadOptions): Promise<ReplayMatch> {
    validateReplayFile(file);

    const base = getReplayApiBase();
    if (!base) {
      return Promise.reject(
        new Error(
          "Replay parsing is not configured. Use the demo replay, or set NEXT_PUBLIC_API_URL.",
        ),
      );
    }

    if (options?.signal?.aborted) {
      return Promise.reject(abortError());
    }

    return new Promise<ReplayMatch>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      let settled = false;

      const finish = (action: () => void) => {
        if (settled) {
          return;
        }
        settled = true;
        options?.signal?.removeEventListener("abort", handleAbort);
        action();
      };

      const handleAbort = () => {
        xhr.abort();
      };

      options?.signal?.addEventListener("abort", handleAbort, { once: true });

      xhr.open("POST", `${base}/replays`);
      xhr.timeout = UPLOAD_TIMEOUT_MS;
      xhr.setRequestHeader("Accept", "application/json");

      xhr.upload.onprogress = (event) => {
        // Some browsers omit the upload total; the file size is still a
        // reliable denominator, so keep showing a real percentage.
        const total =
          event.lengthComputable && event.total > 0 ? event.total : file.size;
        if (total <= 0) {
          report(options, 0, "Uploading replay…", true);
          return;
        }
        const loaded = Math.min(event.loaded, total);
        const percent = Math.round((loaded / total) * 70);
        report(options, percent, "Uploading replay…");
      };

      xhr.upload.onload = () => {
        report(options, 70, "Decoding replay…", true);
      };

      xhr.onload = () => {
        finish(() => {
          const payload = parseJSON(xhr.responseText);
          if (xhr.status < 200 || xhr.status >= 300) {
            reject(new Error(friendlyError(xhr.status, payload)));
            return;
          }
          try {
            const match = parseReplayEnvelope(payload);
            report(options, 100, "Ready");
            resolve(match);
          } catch (error) {
            reject(error);
          }
        });
      };

      xhr.onerror = () => {
        finish(() => {
          reject(
            new Error(
              "Could not reach the replay parser. Check your connection and try again.",
            ),
          );
        });
      };

      xhr.ontimeout = () => {
        finish(() => {
          reject(
            new Error(
              "The replay upload timed out. Try again on a faster connection.",
            ),
          );
        });
      };

      xhr.onabort = () => {
        finish(() => {
          reject(abortError());
        });
      };

      const formData = new FormData();
      formData.append("file", file, file.name);
      report(options, 0, "Preparing replay…");
      xhr.send(formData);
    });
  }

  loadDemo(options?: ReplayLoadOptions): Promise<ReplayMatch> {
    return this.fallback.loadDemo(options);
  }
}

/**
 * Reload fallback for a page refresh: the server cache may still hold the
 * parsed match. Returns null when the cache has expired (404).
 */
export const fetchReplayById = async (
  replayId: string,
  options?: ReplayLoadOptions,
): Promise<ReplayMatch | null> => {
  const base = getReplayApiBase();
  if (!base) {
    return null;
  }

  report(options, 75, "Loading replay…");

  const response = await fetch(`${base}/replays/${encodeURIComponent(replayId)}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: options?.signal,
  });

  if (response.status === 404) {
    return null;
  }

  const payload = parseJSON(await response.text());
  if (!response.ok) {
    throw new Error(friendlyError(response.status, payload));
  }

  const match = parseReplayEnvelope(payload);
  report(options, 100, "Ready");
  return match;
};

export const getReplayDataSource = (): ReplayDataSource =>
  new VrfReplayDataSource();
