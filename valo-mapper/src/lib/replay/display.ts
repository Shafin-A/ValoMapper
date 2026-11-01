import { AGENT_ICON_CONFIGS } from "@/lib/consts/configs/agent-icon/consts";
import { WEAPONS } from "@/lib/consts";
import { formatTimeSinceRoundStart } from "@/lib/matches";
import type { AbilityAction, ToolIconCanvas } from "@/lib/types";
import type {
  ReplayAbilityCasts,
  ReplayAbilitySlot,
  ReplayFramePlayer,
} from "./types";

export const REPLAY_ABILITY_KEY_BY_SLOT: Record<ReplayAbilitySlot, string> = {
  Grenade: "C",
  Ability1: "Q",
  Ability2: "E",
  Ultimate: "X",
};

export type ReplayAbilityDisplay = {
  slot: ReplayAbilitySlot;
  key: string;
  name: string;
  src: string;
  action: AbilityAction;
  castTimeMs?: number;
  charges?: number;
};

export type ReplayUtilityAbilityIcon = {
  id: string;
  name: string;
  src: string;
  action: AbilityAction;
};

const REPLAY_UTILITY_ABILITY_ICONS = new Map<string, ReplayUtilityAbilityIcon>(
  Object.values(AGENT_ICON_CONFIGS)
    .flatMap((abilities) =>
      abilities.flatMap(({ id, name, src, action, alternates = [] }) => [
        { id, name, src, action },
        ...alternates.map((alternate) => ({
          id: alternate.id,
          name: alternate.name,
          src: alternate.src,
          action: alternate.action,
        })),
      ]),
    )
    .map((ability) => [
      ability.id,
      {
        id: ability.id,
        name: ability.name,
        src: ability.src,
        action: ability.action,
      },
    ]),
);

/** Returns the existing ValoMapper ability artwork for a replay utility. */
export const getReplayUtilityAbilityIcon = (
  abilityId?: string,
): ReplayUtilityAbilityIcon | null =>
  abilityId ? (REPLAY_UTILITY_ABILITY_ICONS.get(abilityId) ?? null) : null;

export const getReplayAbilityDisplays = (
  agentName: string,
  casts: ReplayAbilityCasts = {},
): ReplayAbilityDisplay[] => {
  const configs = AGENT_ICON_CONFIGS[agentName] ?? [];

  return configs
    .filter(
      (ability) =>
        ability.slot === "Grenade" ||
        ability.slot === "Ability1" ||
        ability.slot === "Ability2" ||
        ability.slot === "Ultimate",
    )
    .map((ability) => {
      const slot = ability.slot as ReplayAbilitySlot;

      return {
        slot,
        key: REPLAY_ABILITY_KEY_BY_SLOT[slot],
        name: ability.name,
        src: ability.src,
        action: ability.action,
        castTimeMs: casts[slot],
        charges: ability.charges,
      };
    });
};

export const getWeaponImageSrc = (weaponId?: string) => {
  if (!weaponId?.trim()) {
    return null;
  }

  return `/weapons/${weaponId.trim().toUpperCase()}_killstream.png`;
};

/**
 * Riot weapon UUIDs the replay parser emits, mapped to the lobby tool icon
 * name. Keep this aligned with the server's weaponUUIDByFolder table and its
 * melee id.
 */
const REPLAY_WEAPON_NAME_BY_ID: Record<string, string> = {
  "29A0CFAB-485B-F5D5-779A-B59F85E204A8": "classic",
  "9C82E19D-4575-0200-1A81-3EACF00CF872": "vandal",
  "EE8E8D15-496B-07AC-E5F6-8FAE5D4C7B1A": "phantom",
  "462080D1-4035-2937-7C09-27AA2A5C27A7": "spectre",
  "E336C6B8-418D-9340-D77F-7A9E4CFE0702": "sheriff",
  "42DA8CCC-40D5-AFFC-BEEC-15AA47B42EDA": "shorty",
  "1BAA85B4-4C70-1284-64BB-6481DFC3BB4E": "ghost",
  "A03B24D3-4319-996D-0F8C-94BBFBA1DFC7": "operator",
  "5F0AAF7A-4289-3998-D5FF-EB9A5CF7EF5C": "outlaw",
  "F7E1B454-4AD4-1063-EC0A-159E56B58941": "stinger",
  "44D4E95C-4157-0037-81B2-17841BF2E8E3": "frenzy",
  "410B2E0B-4CEB-1321-1727-20858F7F3477": "bandit",
  "4ADE7FAA-4CF1-8376-95EF-39884480959B": "guardian",
  "C4883E50-4494-202C-3EC3-6B8A9284F00B": "marshal",
  "8DB0A1BF-4A50-832A-4566-FAAAA6D250CA": "warden",
  "AE3DE142-4D85-2547-DD26-4E90BED35CF7": "bulldog",
  "910BE174-449B-C412-AB22-D0873436B21B": "bucky",
  "63E6C2B6-4A8E-869C-3D4C-E38355226584": "odin",
  "55D8A0F4-4274-CA67-FE2C-06AB45EFDF58": "ares",
  "EC845BF4-4F79-DDDA-A3DA-0DB3774B2794": "judge",
  "2F59173C-4BED-B6C3-2191-DEA9B58BE9C7": "knife",
};

const WEAPON_DIMENSIONS_BY_NAME = new Map(
  Object.values(WEAPONS)
    .flat()
    .map((weapon) => [
      weapon.name,
      { width: weapon.width, height: weapon.height },
    ]),
);

export type ReplayWeaponIcon = Pick<ToolIconCanvas, "name" | "width" | "height">;

/** The lobby tool icon for a player's equipped weapon, if the replay knows it. */
export const getReplayWeaponIcon = (
  weaponId?: string,
): ReplayWeaponIcon | null => {
  if (!weaponId?.trim()) {
    return null;
  }

  const name = REPLAY_WEAPON_NAME_BY_ID[weaponId.trim().toUpperCase()];
  const dimensions = name ? WEAPON_DIMENSIONS_BY_NAME.get(name) : undefined;
  if (!name || !dimensions) {
    return null;
  }

  return { name, ...dimensions };
};

export const formatReplayTime = (timeMs: number) =>
  formatTimeSinceRoundStart(Math.max(0, timeMs));

export const isAbilityUsed = (
  ability: ReplayAbilityDisplay,
  currentTimeMs: number,
) =>
  ability.castTimeMs !== undefined && currentTimeMs >= ability.castTimeMs;

export const getPlayerHpTone = (hp: number, alive: boolean) => {
  if (!alive || hp <= 0) {
    return "text-slate-500";
  }

  if (hp <= 30) {
    return "text-rose-400";
  }

  if (hp <= 60) {
    return "text-amber-300";
  }

  return "text-emerald-300";
};

export const getPlayerHpBarColor = (hp: number, alive: boolean) => {
  if (!alive || hp <= 0) {
    return "bg-slate-600";
  }

  if (hp <= 30) {
    return "bg-rose-500";
  }

  if (hp <= 60) {
    return "bg-amber-400";
  }

  return "bg-emerald-400";
};

/**
 * State shown for a player at the current scrub position. A missing sample
 * means the round has no data for that player yet, not that they are dead, so
 * the round-stats fallback fills credits, weapon and armour and assumes a full
 * health bar. Samples that do exist are used as-is: an absent weapon or armour
 * id means the player has no known item, not that the round stats apply.
 */
export const getReplayPlayerState = (
  player: ReplayFramePlayer | null,
  fallback?: { credits: number; weaponId?: string; armorId?: string },
) => {
  if (!player) {
    return {
      hp: 100,
      alive: true,
      credits: fallback?.credits ?? 0,
      weaponId: fallback?.weaponId,
      armorId: fallback?.armorId,
      armorPoints: undefined,
    };
  }

  return {
    hp: player.hp,
    alive: player.alive,
    credits: player.credits,
    weaponId: player.weaponId,
    armorId: player.armorId,
    armorPoints: player.armorPoints,
  };
};

const REPLAY_ARMOR_BY_ID: Record<string, { label: string; value: number }> = {
  // Heavy Armor
  "822bcab2-40a2-324e-c137-e09195ad7692": { label: "Heavy Shield", value: 50 },
  // Light Armor
  "4dec83d5-4902-9ab3-bed6-a7a390761157": { label: "Light Shield", value: 25 },
  // Regen Shield
  "b1b9086d-41bd-a516-5d29-e3b34a6f1644": { label: "Regen Shield", value: 25 },
};

export const getReplayArmor = (armorId?: string) => {
  if (!armorId) {
    return null;
  }

  return REPLAY_ARMOR_BY_ID[armorId.toLowerCase()] ?? null;
};
