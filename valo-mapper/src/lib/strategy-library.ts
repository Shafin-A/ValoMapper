export const MAX_STRATEGY_TAGS = 8;
export const MAX_STRATEGY_TAG_LENGTH = 24;
export const STRATEGY_LIBRARY_PAGE_SIZE = 50;

export type StrategySort = "updated" | "created" | "name";
export type StrategyTagMode = "all" | "any";
export type StrategySideFilter = "" | "attack" | "defense";

export type StrategyLibraryFilters = {
  query: string;
  tags: string[];
  tagMode: StrategyTagMode;
  favoriteOnly: boolean;
  mapId: string;
  side: StrategySideFilter;
  sort: StrategySort;
};

export const DEFAULT_STRATEGY_LIBRARY_FILTERS: StrategyLibraryFilters = {
  query: "",
  tags: [],
  tagMode: "all",
  favoriteOnly: false,
  mapId: "",
  side: "",
  sort: "updated",
};

export type StrategyTagValidationError = "tooMany" | "invalid" | null;

export const normalizeStrategyTag = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

export const normalizeStrategyTags = (tags: string[]): string[] => {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const tag of tags) {
    const next = normalizeStrategyTag(tag);
    if (!next || seen.has(next)) continue;
    seen.add(next);
    normalized.push(next);
  }

  return normalized.sort((a, b) => a.localeCompare(b));
};

export const isStrategyTagValid = (tag: string): boolean => {
  const normalized = normalizeStrategyTag(tag);
  if (!normalized) return false;
  if ([...normalized].length > MAX_STRATEGY_TAG_LENGTH) return false;
  return /^[\p{L}\p{N} _-]+$/u.test(normalized);
};

export const validateStrategyTags = (
  tags: string[],
): StrategyTagValidationError => {
  const normalized = normalizeStrategyTags(tags);
  if (normalized.length > MAX_STRATEGY_TAGS) return "tooMany";
  if (normalized.some((tag) => !isStrategyTagValid(tag))) return "invalid";
  return null;
};

export const hasActiveStrategyLibraryFilters = (
  filters: StrategyLibraryFilters,
): boolean =>
  filters.query.trim().length > 0 ||
  filters.tags.length > 0 ||
  filters.favoriteOnly ||
  filters.mapId.length > 0 ||
  filters.side.length > 0;

export const buildStrategyLibrarySearchParams = (
  filters: StrategyLibraryFilters,
  offset?: number,
  limit: number = STRATEGY_LIBRARY_PAGE_SIZE,
): string => {
  const params = new URLSearchParams();

  if (filters.query.trim()) {
    params.set("q", filters.query.trim());
  }
  if (filters.tags.length > 0) {
    params.set("tags", filters.tags.join(","));
  }
  params.set("tagMode", filters.tagMode);
  if (filters.favoriteOnly) {
    params.set("favorite", "true");
  }
  if (filters.mapId) {
    params.set("mapId", filters.mapId);
  }
  if (filters.side) {
    params.set("side", filters.side);
  }
  params.set("sort", filters.sort);

  if (offset !== undefined) {
    params.set("offset", String(Math.max(0, offset)));
  }
  params.set("limit", String(limit));

  return params.toString();
};
