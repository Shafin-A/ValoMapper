import { AGENT_ICON_CONFIGS } from "@/lib/consts";
import { MatchPreview, MatchSummaryResponse } from "@/lib/types";

const ABILITY_DAMAGE_SLOT_MAP = {
  Ultimate: "Ultimate",
  Ability1: "Ability1",
  Ability2: "Ability2",
  GrenadeAbility: "Grenade",
} as const;

export type MatchPlayers = MatchSummaryResponse["players"];
export type MatchPlayer = MatchPlayers[number];
export type MatchRound = MatchSummaryResponse["rounds"][number];
export type MatchRoundEvent = MatchRound["eventLog"][number];
export type MatchKillEvent = Extract<MatchRoundEvent, { eventType: "kill" }>;
export type MatchRoundPlayerStats = MatchRound["playerStats"][number];

export const MATCH_SPIKE_IMAGE_CLASS_NAME =
  "object-contain object-right scale-[-0.65]";
export const MATCH_SPIKE_IMAGE_WRAPPER_CLASS_NAME = "relative h-8 w-full px-2";

export type KillEventImage = {
  src: string;
  alt: string;
  className: string;
  wrapperClassName?: string;
};

const normalizeAgentAssetName = (agentName?: string) => {
  if (!agentName) return "astra";

  const normalized = agentName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

  return normalized;
};

export const getAgentImageSrc = (agentName: string) => {
  const normalized = normalizeAgentAssetName(agentName);
  return `/agents/${normalized}/${normalized}.png`;
};

export const getMapImageSrc = (mapName: string) => {
  const normalized = (mapName || "ascent").toLowerCase().replace(/\s+/g, "");
  return `/maps/listviewicons/${normalized}.webp`;
};

export const getResultLabel = (result: MatchPreview["result"]) => {
  return result === "Win" ? "Victory" : "Defeat";
};

export const getPlayerSummary = (players: MatchPlayers, puuid?: string) => {
  if (!puuid) {
    return undefined;
  }

  return players.find((player) => player.puuid === puuid);
};

export const getPlayerAgentIconSrc = (
  players: MatchPlayers,
  puuid?: string,
) => {
  const player = getPlayerSummary(players, puuid);
  return getAgentImageSrc(player?.characterName || "Astra");
};

export const formatTimeSinceRoundStart = (
  timeSinceRoundStartMillis: number,
) => {
  const totalSeconds = Math.floor(timeSinceRoundStartMillis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export const getRoundOutcomeText = (
  roundResultCode: string,
  winningTeam: string,
  currentPlayerTeamId: string | undefined,
) => {
  const normalizedResult =
    roundResultCode === "TimeExpired"
      ? "Time Expired"
      : roundResultCode === "Detonate"
        ? "Detonation"
        : roundResultCode;

  if (!currentPlayerTeamId) {
    return normalizedResult;
  }

  const outcome = winningTeam === currentPlayerTeamId ? "Win" : "Loss";
  return `${normalizedResult} ${outcome}`;
};

export const getRoundOutcomeIconSrc = (
  roundResultCode: string,
  winningTeam: string,
  currentPlayerTeamId: string | undefined,
  isBestRound: boolean,
) => {
  if (isBestRound) {
    return "/matchOutcomes/TX_Icon_MVPStar_Gold.png";
  }

  const outcomeSuffix = currentPlayerTeamId
    ? winningTeam === currentPlayerTeamId
      ? "win1"
      : "loss1"
    : "win1";

  switch (roundResultCode) {
    case "Elimination":
      return `/matchOutcomes/elimination${outcomeSuffix}.png`;
    case "Detonate":
      return `/matchOutcomes/explosion${outcomeSuffix}.png`;
    case "Defuse":
      return `/matchOutcomes/diffuse${outcomeSuffix}.png`;
    case "TimeExpired":
      return `/matchOutcomes/time${outcomeSuffix}.png`;
    case "Surrendered":
      return "/matchOutcomes/EarlySurrender_Flag.png";
    default:
      return `/matchOutcomes/${roundResultCode.toLowerCase()}${outcomeSuffix}.png`;
  }
};

const getWeaponKillstreamImageSrc = (damageItem: string) => {
  return `/weapons/${damageItem.trim().toUpperCase()}_killstream.png`;
};

const getAbilityKillIconSrc = (
  players: MatchPlayers,
  killerPuuid: string,
  damageItem?: string,
) => {
  if (!damageItem) {
    return undefined;
  }

  const slot =
    ABILITY_DAMAGE_SLOT_MAP[damageItem as keyof typeof ABILITY_DAMAGE_SLOT_MAP];
  if (!slot) {
    return undefined;
  }

  const killer = getPlayerSummary(players, killerPuuid);
  if (!killer?.characterName) {
    return undefined;
  }

  return AGENT_ICON_CONFIGS[killer.characterName]?.find(
    (ability) => ability.slot === slot,
  )?.src;
};

export const getKillEventImage = (
  event: MatchKillEvent,
  players: MatchPlayers,
): KillEventImage => {
  switch (event.damageType) {
    case "Bomb":
      return {
        src: "/tools/spike.webp",
        alt: "Spike",
        className: MATCH_SPIKE_IMAGE_CLASS_NAME,
        wrapperClassName: MATCH_SPIKE_IMAGE_WRAPPER_CLASS_NAME,
      };
    case "Fall":
      return {
        src: "/weapons/fall_death.png",
        alt: "Fall damage",
        className: "object-contain object-right scale-x-[-1]",
        wrapperClassName: "relative ml-1 h-8 w-full",
      };
    case "Ability": {
      const abilityIconSrc = getAbilityKillIconSrc(
        players,
        event.killerPuuid,
        event.damageItem,
      );

      if (abilityIconSrc) {
        return {
          src: abilityIconSrc,
          alt: "Ability",
          className: "object-contain object-right scale-x-[-1]",
        };
      }

      return {
        src: getPlayerAgentIconSrc(players, event.killerPuuid),
        alt: "Ability",
        className: "object-contain object-right scale-x-[-1]",
      };
    }
  }

  if (
    (event.damageType === "Weapon" || event.damageType === "Melee") &&
    event.damageItem?.trim()
  ) {
    return {
      src: getWeaponKillstreamImageSrc(event.damageItem),
      alt: event.damageType === "Melee" ? "Melee" : "Weapon",
      className: "object-contain object-right scale-x-[-1]",
    };
  }

  return {
    src: getPlayerAgentIconSrc(players, event.killerPuuid),
    alt: "Kill source",
    className: "object-contain object-right scale-x-[-1]",
  };
};
