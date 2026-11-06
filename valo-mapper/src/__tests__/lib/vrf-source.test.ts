import {
  fetchReplayById,
  getReplayApiBase,
  VrfReplayDataSource,
} from "@/lib/replay/vrf-source";
import type { ReplayLoadProgress } from "@/lib/replay/types";

type ProgressEventLike = {
  lengthComputable: boolean;
  loaded: number;
  total: number;
};

class FakeXMLHttpRequest {
  static instances: FakeXMLHttpRequest[] = [];

  method = "";
  url = "";
  timeout = 0;
  status = 0;
  responseText = "";
  aborted = false;
  body: Document | XMLHttpRequestBodyInit | null = null;

  upload = {
    onprogress: null as ((event: ProgressEventLike) => void) | null,
    onload: null as (() => void) | null,
  };

  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeout: (() => void) | null = null;
  onabort: (() => void) | null = null;

  constructor() {
    FakeXMLHttpRequest.instances.push(this);
  }

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader() {}

  send(body: Document | XMLHttpRequestBodyInit | null) {
    this.body = body;
  }

  abort() {
    this.aborted = true;
    this.onabort?.();
  }
}

const matchPayload = {
  replayId: "a".repeat(64),
  match: {
    matchId: "match-1",
    mapId: "ascent",
    mapName: "Ascent",
    queueLabel: "Replay",
    gameStartAt: "2024-01-01T00:00:00Z",
    viewer: null,
    totalRounds: 1,
    players: [],
    rounds: [],
  },
};

const makeFile = (size = 4) =>
  new File([new Uint8Array(size)], "match.vrf", {
    type: "application/octet-stream",
  });

describe("VrfReplayDataSource", () => {
  const originalXHR = global.XMLHttpRequest;

  beforeEach(() => {
    FakeXMLHttpRequest.instances = [];
    global.XMLHttpRequest =
      FakeXMLHttpRequest as unknown as typeof XMLHttpRequest;
    process.env.NEXT_PUBLIC_API_URL = "http://api.test/api/";
  });

  afterEach(() => {
    global.XMLHttpRequest = originalXHR;
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it("uploads with XHR, maps progress and marks the match as VRF", async () => {
    const progress: ReplayLoadProgress[] = [];
    const source = new VrfReplayDataSource();

    const promise = source.load(makeFile(), {
      onProgress: (update) => progress.push(update),
    });

    const xhr = FakeXMLHttpRequest.instances[0];
    expect(xhr.method).toBe("POST");
    expect(xhr.url).toBe("http://api.test/api/replays");
    expect(xhr.timeout).toBe(5 * 60 * 1000);

    xhr.upload.onprogress?.({
      lengthComputable: true,
      loaded: 50,
      total: 100,
    });
    xhr.upload.onload?.();

    xhr.status = 200;
    xhr.responseText = JSON.stringify(matchPayload);
    xhr.onload?.();

    const match = await promise;
    expect(match.source).toBe("vrf");
    expect(match.replayId).toBe(matchPayload.replayId);
    expect(progress.map((update) => update.percent)).toEqual([
      0, 35, 70, 100,
    ]);
    expect(progress[2]).toMatchObject({
      percent: 70,
      label: "Decoding replay…",
      indeterminate: true,
    });
    expect(progress.at(-1)?.label).toBe("Ready");
    expect(progress.at(-1)?.indeterminate).toBeUndefined();
  });

  it("falls back to the file size when the upload total is unknown", async () => {
    const progress: ReplayLoadProgress[] = [];
    const source = new VrfReplayDataSource();
    const promise = source.load(makeFile(1024), {
      onProgress: (update) => progress.push(update),
    });
    const xhr = FakeXMLHttpRequest.instances[0];

    xhr.upload.onprogress?.({
      lengthComputable: false,
      loaded: 512,
      total: 0,
    });

    expect(progress.at(-1)).toMatchObject({
      percent: 35,
      label: "Uploading replay…",
    });
    expect(progress.at(-1)?.indeterminate).toBeUndefined();

    xhr.status = 200;
    xhr.responseText = JSON.stringify(matchPayload);
    xhr.onload?.();

    await promise;
  });

  it("maps a coded 422 error to friendly prose", async () => {
    const source = new VrfReplayDataSource();
    const promise = source.load(makeFile());
    const xhr = FakeXMLHttpRequest.instances[0];

    xhr.status = 422;
    xhr.responseText = JSON.stringify({
      error: "raw server prose",
      code: "unsupported_build",
    });
    xhr.onload?.();

    await expect(promise).rejects.toThrow(
      "This replay was recorded on a game build that is not supported yet.",
    );
  });

  it("uses the parser's JSON error when the browser reports an upload error", async () => {
    const source = new VrfReplayDataSource();
    const promise = source.load(makeFile());
    const xhr = FakeXMLHttpRequest.instances[0];

    xhr.status = 429;
    xhr.responseText = JSON.stringify({
      error: "Too many replays are being parsed. Try again later.",
      code: "rate_limited",
    });
    xhr.onerror?.();

    await expect(promise).rejects.toThrow(
      "Too many replays are being parsed. Try again later.",
    );
  });

  it("keeps the network message when no parser response arrived", async () => {
    const source = new VrfReplayDataSource();
    const promise = source.load(makeFile());
    const xhr = FakeXMLHttpRequest.instances[0];

    xhr.status = 0;
    xhr.onerror?.();

    await expect(promise).rejects.toThrow(
      "Could not reach the replay parser. Check your connection and try again.",
    );
  });

  it("rejects malformed 200 responses", async () => {
    const source = new VrfReplayDataSource();
    const promise = source.load(makeFile());
    const xhr = FakeXMLHttpRequest.instances[0];

    xhr.status = 200;
    xhr.responseText = JSON.stringify({ replayId: "x", match: { rounds: [] } });
    xhr.onload?.();

    await expect(promise).rejects.toThrow(
      "The replay parser returned an invalid match.",
    );
  });

  it("aborts the XHR when the caller's signal fires", async () => {
    const source = new VrfReplayDataSource();
    const controller = new AbortController();
    const promise = source.load(makeFile(), { signal: controller.signal });
    const xhr = FakeXMLHttpRequest.instances[0];

    controller.abort();

    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
    expect(xhr.aborted).toBe(true);
  });

  it("keeps the demo path working without an API URL", async () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    expect(getReplayApiBase()).toBe("");

    const source = new VrfReplayDataSource();
    await expect(source.load(makeFile())).rejects.toThrow(
      "Replay parsing is not configured.",
    );

    const demo = await source.loadDemo();
    expect(demo.rounds.length).toBeGreaterThan(0);
  });
});

describe("fetchReplayById", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = "http://api.test/api";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it("returns the cached match", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(matchPayload),
    }) as unknown as typeof fetch;

    const match = await fetchReplayById(matchPayload.replayId);
    expect(match?.source).toBe("vrf");
    expect(global.fetch).toHaveBeenCalledWith(
      `http://api.test/api/replays/${matchPayload.replayId}`,
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("logs parser warnings without putting them in the UI payload", async () => {
    const warn = jest.mocked(console.warn);
    warn.mockClear();
    const payload = {
      ...matchPayload,
      warnings: ["Some events were skipped.", "Movement was missing."],
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(payload),
    }) as unknown as typeof fetch;

    const match = await fetchReplayById(matchPayload.replayId);

    expect(match?.warnings).toEqual(payload.warnings);
    expect(warn).toHaveBeenCalledWith("[replay] parser warnings", payload.warnings);
  });

  it("returns null when the cache has expired", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => "",
    }) as unknown as typeof fetch;

    await expect(fetchReplayById(matchPayload.replayId)).resolves.toBeNull();
  });
});
