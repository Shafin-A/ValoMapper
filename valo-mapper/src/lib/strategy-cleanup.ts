import {
  FREE_STRATEGY_LIMIT,
  STRATEGY_CLEANUP_GRACE_PERIOD_DAYS,
} from "@/lib/consts";
import { StrategyData } from "@/lib/types";
import { convertFolderOrStrategyId } from "@/lib/utils";

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export type StrategyCleanupGracePeriod = {
  endsAt: Date;
  daysRemaining: number;
};

export type StrategyRetentionPreview = {
  kept: StrategyData[];
  deleted: StrategyData[];
};

const flattenStrategies = (items: StrategyData[]): StrategyData[] => {
  return items.reduce<StrategyData[]>((result, item) => {
    if (item.type === "strategy") {
      result.push(item);
      return result;
    }

    if (!item.children || item.children.length === 0) {
      return result;
    }

    result.push(...flattenStrategies(item.children));
    return result;
  }, []);
};

const getStrategySortKey = (id: string): number | null => {
  if (!id.startsWith("strategy-")) {
    return null;
  }

  const strategyID = convertFolderOrStrategyId(id, "strategy");
  if (Number.isNaN(strategyID)) {
    return null;
  }

  return strategyID;
};

export const getStrategyCleanupGracePeriod = (
  hasValoMapperPro: boolean,
  subscriptionEndedAt: Date | null,
): StrategyCleanupGracePeriod | null => {
  if (hasValoMapperPro || subscriptionEndedAt === null) {
    return null;
  }

  if (Number.isNaN(subscriptionEndedAt.getTime())) {
    return null;
  }

  const now = Date.now();
  const endedAtMs = subscriptionEndedAt.getTime();
  if (endedAtMs > now) {
    return null;
  }

  const graceEndsAt = new Date(
    endedAtMs + STRATEGY_CLEANUP_GRACE_PERIOD_DAYS * MILLISECONDS_PER_DAY,
  );
  if (now >= graceEndsAt.getTime()) {
    return null;
  }

  const daysRemaining = Math.max(
    1,
    Math.ceil((graceEndsAt.getTime() - now) / MILLISECONDS_PER_DAY),
  );

  return {
    endsAt: graceEndsAt,
    daysRemaining,
  };
};

export const getStrategyRetentionPreview = (
  items: StrategyData[],
  keepLimit: number = FREE_STRATEGY_LIMIT,
): StrategyRetentionPreview => {
  const orderedStrategies = flattenStrategies(items)
    .map((strategy) => ({
      strategy,
      sortKey: getStrategySortKey(strategy.id),
    }))
    .filter(
      (entry): entry is { strategy: StrategyData; sortKey: number } =>
        entry.sortKey !== null,
    )
    .sort((a, b) => b.sortKey - a.sortKey)
    .map((entry) => entry.strategy);

  return {
    kept: orderedStrategies.slice(0, keepLimit),
    deleted: orderedStrategies.slice(keepLimit),
  };
};

export const summarizeStrategyNames = (
  strategies: StrategyData[],
  maxVisible: number = 5,
): {
  visibleNames: string[];
  hiddenCount: number;
} => {
  const visibleNames = strategies
    .slice(0, maxVisible)
    .map((strategy) => strategy.name.trim() || "Untitled strategy");

  return {
    visibleNames,
    hiddenCount: Math.max(strategies.length - maxVisible, 0),
  };
};
