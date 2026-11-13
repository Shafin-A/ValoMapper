import agentIconConfigData from "@/lib/consts/data/agent-icon-configs.json";
import agentUltimateCostData from "@/lib/consts/data/agent-ultimate-costs.json";
import type {
  AbilityAlternate,
  AbilityIconConfig,
  AbilityIconDefinition,
  AbilityIconItem,
} from "@/lib/types";

export const AGENT_ICON_CONFIGS: Record<string, AbilityIconConfig> =
  agentIconConfigData as unknown as Record<string, AbilityIconConfig>;

export const getAbilityVariants = (
  ability: AbilityIconDefinition,
): AbilityIconItem[] => {
  const main: AbilityIconItem = {
    id: ability.id,
    src: ability.src,
    name: ability.name,
    action: ability.action,
    slot: ability.slot,
  };

  const alts: AbilityIconItem[] = (ability.alternates ?? []).map(
    (alt: AbilityAlternate) => ({
      id: alt.id,
      src: alt.src,
      name: alt.name,
      action: alt.action,
      slot: alt.slot,
    }),
  );

  return [main, ...alts];
};

export const ABILITY_LOOKUP: Record<string, AbilityIconItem> = Object.values(
  AGENT_ICON_CONFIGS,
)
  .flatMap((items: AbilityIconDefinition[]) =>
    items.flatMap((item) => getAbilityVariants(item)),
  )
  .reduce(
    (acc, ability) => {
      acc[ability.name] = ability;
      return acc;
    },
    {} as Record<string, AbilityIconItem>,
  );

export const resolveAbilityVariant = (
  ability: AbilityIconDefinition,
  variantIndex: number = 0,
): AbilityIconItem => {
  const variants = getAbilityVariants(ability);
  return variants[variantIndex < variants.length ? variantIndex : 0];
};

export const resolveAbilityIconItem = resolveAbilityVariant;

export const findAbilityDefinitionByAction = (
  action: string,
): AbilityIconDefinition | null => {
  for (const items of Object.values(AGENT_ICON_CONFIGS)) {
    for (const item of items) {
      if (item.action === action) return item;
      if (item.alternates?.some((alt) => alt.action === action)) return item;
    }
  }
  return null;
};

// Ultimate points required to cast; the replay reports current points, not cost.
export const AGENT_ULTIMATE_COSTS: Record<string, number> =
  agentUltimateCostData;

export const getAgentUltimateCost = (agentName: string): number | undefined =>
  AGENT_ULTIMATE_COSTS[agentName];
