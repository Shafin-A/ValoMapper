import {
  buildStrategyLibrarySearchParams,
  DEFAULT_STRATEGY_LIBRARY_FILTERS,
  hasActiveStrategyLibraryFilters,
  MAX_STRATEGY_TAGS,
  normalizeStrategyTags,
  validateStrategyTags,
} from "@/lib/strategy-library";

describe("strategy library helpers", () => {
  it("normalizes, deduplicates, and sorts tags", () => {
    expect(
      normalizeStrategyTags(["  Post-Plant ", "a-site", "post-plant", "A Site"]),
    ).toEqual(["a site", "a-site", "post-plant"]);
  });

  it("validates tag limits and characters", () => {
    expect(validateStrategyTags(["post-plant", "a-site"])).toBeNull();
    expect(validateStrategyTags(["post/plant"])).toBe("invalid");
    expect(
      validateStrategyTags(
        Array.from({ length: MAX_STRATEGY_TAGS + 1 }, (_, index) => `tag-${index}`),
      ),
    ).toBe("tooMany");
  });

  it("builds server query params", () => {
    const params = new URLSearchParams(
      buildStrategyLibrarySearchParams(
        {
          ...DEFAULT_STRATEGY_LIBRARY_FILTERS,
          query: "  B site ",
          tags: ["a-site", "post-plant"],
          tagMode: "any",
          favoriteOnly: true,
          mapId: "ascent",
          side: "defense",
          sort: "name",
        },
        25,
        50,
      ),
    );

    expect(params.get("q")).toBe("B site");
    expect(params.get("tags")).toBe("a-site,post-plant");
    expect(params.get("tagMode")).toBe("any");
    expect(params.get("favorite")).toBe("true");
    expect(params.get("mapId")).toBe("ascent");
    expect(params.get("side")).toBe("defense");
    expect(params.get("sort")).toBe("name");
    expect(params.get("offset")).toBe("25");
    expect(params.get("limit")).toBe("50");
  });

  it("detects active filters", () => {
    expect(hasActiveStrategyLibraryFilters(DEFAULT_STRATEGY_LIBRARY_FILTERS)).toBe(
      false,
    );
    expect(
      hasActiveStrategyLibraryFilters({
        ...DEFAULT_STRATEGY_LIBRARY_FILTERS,
        favoriteOnly: true,
      }),
    ).toBe(true);
    expect(
      hasActiveStrategyLibraryFilters({
        ...DEFAULT_STRATEGY_LIBRARY_FILTERS,
        sort: "name",
      }),
    ).toBe(false);
  });
});
