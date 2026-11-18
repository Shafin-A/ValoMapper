import {
  getStrategyCleanupGracePeriod,
  getStrategyRetentionPreview,
  summarizeStrategyNames,
} from "@/lib/strategy-cleanup";
import { StrategyData } from "@/lib/types";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-01-15T12:00:00Z");

const strategy = (id: number, name = `Strategy ${id}`): StrategyData => ({
  id: `strategy-${id}`,
  name,
  type: "strategy",
});

const folder = (
  id: number,
  children: StrategyData[] = [],
): StrategyData => ({
  id: `folder-${id}`,
  name: `Folder ${id}`,
  type: "folder",
  children,
});

describe("getStrategyCleanupGracePeriod", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("does not schedule cleanup for premium users", () => {
    expect(
      getStrategyCleanupGracePeriod(true, new Date(NOW.getTime() - DAY_MS)),
    ).toBeNull();
  });

  it("does not schedule cleanup without a subscription end date", () => {
    expect(getStrategyCleanupGracePeriod(false, null)).toBeNull();
  });

  it("ignores invalid subscription end dates", () => {
    expect(getStrategyCleanupGracePeriod(false, new Date("not-a-date"))).toBeNull();
  });

  it("ignores subscription end dates in the future", () => {
    expect(
      getStrategyCleanupGracePeriod(false, new Date(NOW.getTime() + DAY_MS)),
    ).toBeNull();
  });

  it("returns the remaining days inside the grace period", () => {
    const result = getStrategyCleanupGracePeriod(
      false,
      new Date(NOW.getTime() - 4 * DAY_MS),
    );

    expect(result).not.toBeNull();
    expect(result?.endsAt.getTime()).toBe(NOW.getTime() + 10 * DAY_MS);
    expect(result?.daysRemaining).toBe(10);
  });

  it("rounds partial days up to at least one day", () => {
    const result = getStrategyCleanupGracePeriod(
      false,
      new Date(NOW.getTime() - (14 * DAY_MS - 60_000)),
    );

    expect(result?.daysRemaining).toBe(1);
  });

  it("returns null once the grace period has elapsed", () => {
    expect(
      getStrategyCleanupGracePeriod(false, new Date(NOW.getTime() - 14 * DAY_MS)),
    ).toBeNull();
    expect(
      getStrategyCleanupGracePeriod(false, new Date(NOW.getTime() - 30 * DAY_MS)),
    ).toBeNull();
  });
});

describe("getStrategyRetentionPreview", () => {
  it("keeps the newest strategy by default and deletes the rest", () => {
    const tree = [
      folder(1, [strategy(1), strategy(5)]),
      strategy(3),
      folder(2, [strategy(10)]),
    ];

    const { kept, deleted } = getStrategyRetentionPreview(tree);

    expect(kept.map((item) => item.id)).toEqual(["strategy-10"]);
    expect(deleted.map((item) => item.id)).toEqual([
      "strategy-5",
      "strategy-3",
      "strategy-1",
    ]);
  });

  it("supports a custom keep limit", () => {
    const { kept, deleted } = getStrategyRetentionPreview(
      [strategy(1), strategy(4), strategy(2)],
      2,
    );

    expect(kept.map((item) => item.id)).toEqual(["strategy-4", "strategy-2"]);
    expect(deleted.map((item) => item.id)).toEqual(["strategy-1"]);
  });

  it("ignores non-strategy and malformed nodes", () => {
    const { kept, deleted } = getStrategyRetentionPreview(
      [
        folder(1, [strategy(2)]),
        { id: "strategy-not-a-number", name: "Broken", type: "strategy" },
        { id: "other-3", name: "Other", type: "strategy" },
      ],
      5,
    );

    expect(kept.map((item) => item.id)).toEqual(["strategy-2"]);
    expect(deleted).toEqual([]);
  });

  it("returns empty lists for an empty tree", () => {
    expect(getStrategyRetentionPreview([], 1)).toEqual({
      kept: [],
      deleted: [],
    });
  });
});

describe("summarizeStrategyNames", () => {
  const names = (...values: string[]) =>
    values.map((name, index) => strategy(index + 1, name));

  it("trims names and substitutes a placeholder for blank names", () => {
    expect(summarizeStrategyNames(names("  A Site ", "   "))).toEqual({
      visibleNames: ["A Site", "Untitled strategy"],
      hiddenCount: 0,
    });
  });

  it("limits visible names and reports the hidden count", () => {
    expect(
      summarizeStrategyNames(names("One", "Two", "Three", "Four"), 2),
    ).toEqual({
      visibleNames: ["One", "Two"],
      hiddenCount: 2,
    });
  });

  it("defaults to five visible names", () => {
    expect(summarizeStrategyNames(names("1", "2", "3", "4", "5", "6"))).toEqual(
      {
        visibleNames: ["1", "2", "3", "4", "5"],
        hiddenCount: 1,
      },
    );
  });

  it("reports no hidden names when everything fits", () => {
    expect(summarizeStrategyNames(names("Only"), 5)).toEqual({
      visibleNames: ["Only"],
      hiddenCount: 0,
    });
  });
});
