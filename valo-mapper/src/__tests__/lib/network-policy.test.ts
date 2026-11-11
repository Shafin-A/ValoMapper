import { shouldWarmAllAssets } from "@/lib/network-policy";

type ConnectionLike = {
  saveData?: boolean;
  effectiveType?: string;
  type?: string;
  downlink?: number;
  rtt?: number;
};

const originalConnection = (
  navigator as Navigator & { connection?: ConnectionLike }
).connection;

const setConnection = (connection: ConnectionLike | undefined) => {
  Object.defineProperty(navigator, "connection", {
    configurable: true,
    value: connection,
  });
};

describe("shouldWarmAllAssets", () => {
  afterEach(() => {
    setConnection(originalConnection);
  });

  it("warms all assets on desktop", () => {
    setConnection({ effectiveType: "4g" });
    expect(shouldWarmAllAssets(false)).toBe(true);
  });

  it("skips full warmup on mobile", () => {
    setConnection({ effectiveType: "4g" });
    expect(shouldWarmAllAssets(true)).toBe(false);
  });

  it("skips full warmup when Save-Data is enabled", () => {
    setConnection({ saveData: true, effectiveType: "4g" });
    expect(shouldWarmAllAssets(false)).toBe(false);
  });

  it("skips full warmup on cellular connections", () => {
    setConnection({ type: "cellular", effectiveType: "4g" });
    expect(shouldWarmAllAssets(false)).toBe(false);
  });

  it("skips full warmup on slow connections", () => {
    setConnection({ effectiveType: "3g" });
    expect(shouldWarmAllAssets(false)).toBe(false);

    setConnection({ effectiveType: "2g" });
    expect(shouldWarmAllAssets(false)).toBe(false);

    setConnection({ downlink: 1 });
    expect(shouldWarmAllAssets(false)).toBe(false);

    setConnection({ rtt: 400 });
    expect(shouldWarmAllAssets(false)).toBe(false);
  });

  it("warms desktop assets when connection information is unavailable", () => {
    setConnection(undefined);
    expect(shouldWarmAllAssets(false)).toBe(true);
  });
});
