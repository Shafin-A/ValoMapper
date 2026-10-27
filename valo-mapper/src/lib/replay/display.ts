import { AGENT_ICON_CONFIGS } from "@/lib/consts/configs/agent-icon/consts";
import { formatTimeSinceRoundStart } from "@/lib/matches";
import type { AbilityAction } from "@/lib/types";
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
 * Absence from a frame means "no positional sample this tick", not "dead": the
 * server omits a player across a gap longer than the interpolation limit. The
 * scoreboard shows a full bar for them instead of flashing gray. A real death
 * arrives as a frame sample with `alive: false`.
 */
export const getReplayPlayerState = (
  player: ReplayFramePlayer | undefined,
  fallback?: { credits: number; weaponId?: string; armorId?: string },
) => ({
  hp: player?.hp ?? 100,
  alive: player?.alive ?? true,
  credits: player?.credits ?? fallback?.credits ?? 0,
  weaponId: player?.weaponId ?? fallback?.weaponId,
  armorId: player?.armorId ?? fallback?.armorId,
});

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
