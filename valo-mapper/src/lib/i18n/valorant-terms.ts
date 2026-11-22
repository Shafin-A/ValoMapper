export type ValorantTermMeta = {
  source: string;
  generatedAt: string;
  riotClientVersion: string | null;
  locales: string[];
};

export type ValorantTermData = {
  _meta: ValorantTermMeta;
  agents: Record<string, { name: string; role: string }>;
  roles: Record<string, string>;
  abilities: Record<string, Record<string, string>>;
  maps: Record<string, string>;
  weapons: Record<string, string>;
};

export const EMPTY_VALORANT_TERMS: ValorantTermData = {
  _meta: {
    source: "fallback",
    generatedAt: "",
    riotClientVersion: null,
    locales: [],
  },
  agents: {},
  roles: {},
  abilities: {},
  maps: {},
  weapons: {},
};

export const getLocalizedAgentName = (
  terms: ValorantTermData,
  canonicalName: string,
): string => terms.agents[canonicalName]?.name ?? canonicalName;

export const getLocalizedAgentRole = (
  terms: ValorantTermData,
  canonicalName: string,
): string => terms.agents[canonicalName]?.role ?? "";

export const getLocalizedRoleName = (
  terms: ValorantTermData,
  canonicalRole: string,
): string => terms.roles[canonicalRole] ?? canonicalRole;

export const getLocalizedAbilityName = (
  terms: ValorantTermData,
  canonicalAgentName: string,
  slot: string,
  fallback: string,
): string => terms.abilities[canonicalAgentName]?.[slot] ?? fallback;

export const getLocalizedMapName = (
  terms: ValorantTermData,
  mapId: string,
  fallback: string,
): string => terms.maps[mapId] ?? fallback;

export const getLocalizedWeaponName = (
  terms: ValorantTermData,
  weaponSlug: string,
  fallback: string,
): string => terms.weapons[weaponSlug] ?? fallback;
