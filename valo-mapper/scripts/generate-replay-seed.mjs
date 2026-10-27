#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(projectRoot, "..");

const match = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "match_response.json"), "utf8"),
);
const agents = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "agents.json"), "utf8"),
);

const agentNameByUuid = new Map(
  agents.data.map((agent) => [agent.uuid.toLowerCase(), agent.displayName]),
);

const MAP_NAMES = {
  Pitt: "Pearl",
  Jam: "Lotus",
  Bonsai: "Split",
  Triad: "Haven",
  Port: "Icebox",
  Foxtrot: "Breeze",
  Canyon: "Fracture",
  Infinity: "Abyss",
  Ascent: "Ascent",
  Bind: "Bind",
  Corrode: "Corrode",
  Sunset: "Sunset",
  Summit: "Summit",
};

const QUEUE_LABELS = {
  competitive: "Competitive",
  unrated: "Unrated",
  spikerush: "Spike Rush",
  deathmatch: "Deathmatch",
  custom: "Custom",
};

const hash = (value) => {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
};

const otherTeam = (teamId) => (teamId === "Red" ? "Blue" : "Red");

const mapCodeName = match.matchInfo.mapId.split("/").filter(Boolean).pop();
const mapName = MAP_NAMES[mapCodeName] ?? mapCodeName;
const mapId = mapName.toLowerCase().replace(/\s+/g, "");
const totalRounds = match.roundResults.length;

const players = match.players.map((player) => ({
  puuid: player.puuid,
  gameName: player.gameName,
  tagLine: player.tagLine,
  teamId: player.teamId,
  characterName:
    agentNameByUuid.get(player.characterId.toLowerCase()) ?? "Unknown",
}));

const score = { Red: 0, Blue: 0 };

const buildKillEvents = (round) => {
  const seen = new Set();
  const events = [];

  for (const playerStats of round.playerStats) {
    for (const kill of playerStats.kills ?? []) {
      const key = `${kill.killer}-${kill.victim}-${kill.timeSinceRoundStartMillis}`;
      if (seen.has(key)) continue;
      seen.add(key);

      events.push({
        eventType: "kill",
        timeSinceRoundStartMillis: kill.timeSinceRoundStartMillis,
        killerPuuid: kill.killer,
        victimPuuid: kill.victim,
        damageType: kill.finishingDamage?.damageType ?? "",
        damageItem: kill.finishingDamage?.damageItem ?? undefined,
        victimLocation: kill.victimLocation,
        playerLocations: kill.playerLocations,
      });
    }
  }

  return events;
};

const buildRoundEventLog = (round) => {
  const events = buildKillEvents(round);

  if (round.bombPlanter && round.plantRoundTime > 0) {
    events.push({
      eventType: "spike_planted",
      timeSinceRoundStartMillis: round.plantRoundTime,
      planterPuuid: round.bombPlanter,
      plantLocation: round.plantLocation,
      plantPlayerLocations: round.plantPlayerLocations ?? undefined,
    });
  }

  if (round.bombDefuser && round.defuseRoundTime > 0) {
    events.push({
      eventType: "spike_defused",
      timeSinceRoundStartMillis: round.defuseRoundTime,
      defuserPuuid: round.bombDefuser,
      defuseLocation: round.defuseLocation,
      defusePlayerLocations: round.defusePlayerLocations ?? undefined,
    });
  }

  return events.sort(
    (left, right) =>
      left.timeSinceRoundStartMillis - right.timeSinceRoundStartMillis,
  );
};

const rounds = match.roundResults.map((round, index) => {
  const eventLog = buildRoundEventLog(round);
  const maxEventTime = eventLog.reduce(
    (max, event) => Math.max(max, event.timeSinceRoundStartMillis),
    0,
  );
  const durationMs = Math.min(120_000, Math.max(45_000, maxEventTime + 6_000));

  const winningTeam = round.winningTeam;
  const attackTeamId =
    round.winningTeamRole === "Attacker" ? winningTeam : otherTeam(winningTeam);

  score[winningTeam] += 1;

  const deathsByPuuid = new Map();
  const assistsByPuuid = new Map();
  for (const event of eventLog) {
    if (event.eventType !== "kill") continue;
    deathsByPuuid.set(
      event.victimPuuid,
      (deathsByPuuid.get(event.victimPuuid) ?? 0) + 1,
    );
  }
  for (const playerStats of round.playerStats) {
    for (const kill of playerStats.kills ?? []) {
      for (const assistant of kill.assistants ?? []) {
        assistsByPuuid.set(assistant, (assistsByPuuid.get(assistant) ?? 0) + 1);
      }
    }
  }

  const incomingDamageByPuuid = new Map();
  for (const playerStats of round.playerStats) {
    for (const damage of playerStats.damage ?? []) {
      incomingDamageByPuuid.set(
        damage.receiver,
        (incomingDamageByPuuid.get(damage.receiver) ?? 0) + damage.damage,
      );
    }
  }

  const playerStats = round.playerStats.map((stats) => {
    const player = match.players.find(
      (candidate) => candidate.puuid === stats.puuid,
    );
    const abilityCasts = player?.stats?.abilityCasts ?? {};
    const castSchedule = {};

    const slots = [
      ["Grenade", abilityCasts.grenadeCasts ?? 0, 6_000, 45_000],
      ["Ability1", abilityCasts.ability1Casts ?? 0, 5_000, 45_000],
      ["Ability2", abilityCasts.ability2Casts ?? 0, 8_000, 45_000],
      ["Ultimate", abilityCasts.ultimateCasts ?? 0, 22_000, 50_000],
    ];

    for (const [slot, casts, baseTime, spread] of slots) {
      const probability = Math.min(1, casts / totalRounds);
      const roll = (hash(`${stats.puuid}-${index}-${slot}`) % 1000) / 1000;
      if (roll >= probability) continue;

      const castTime = Math.min(
        durationMs - 2_000,
        baseTime + (hash(`${stats.puuid}-${index}-${slot}-time`) % spread),
      );
      castSchedule[slot] = castTime;
    }

    return {
      puuid: stats.puuid,
      score: stats.score,
      kills: (stats.kills ?? []).length,
      deaths: deathsByPuuid.get(stats.puuid) ?? 0,
      assists: assistsByPuuid.get(stats.puuid) ?? 0,
      economy: {
        loadoutValue: stats.economy?.loadoutValue ?? 0,
        remaining: stats.economy?.remaining ?? 0,
      },
      weaponId: stats.economy?.weapon || undefined,
      armorId: stats.economy?.armor || undefined,
      incomingDamage: incomingDamageByPuuid.get(stats.puuid) ?? 0,
      abilityCasts: castSchedule,
    };
  });

  return {
    roundNumber: index + 1,
    winningTeam,
    roundResultCode: round.roundResult ?? "Elimination",
    attackTeamId,
    scoreAfterRound: { red: score.Red, blue: score.Blue },
    durationMs,
    playerStats,
    eventLog,
  };
});

const seed = {
  matchId: match.matchInfo.matchId,
  mapId,
  mapName,
  queueLabel: QUEUE_LABELS[match.matchInfo.queueId] ?? match.matchInfo.queueId,
  gameStartAt: new Date(match.matchInfo.gameStartMillis).toISOString(),
  totalRounds,
  players,
  viewer: null,
  rounds,
};

const output = `// This file is generated by scripts/generate-replay-seed.mjs.
// Do not edit by hand; re-run the script to refresh the sample replay.
import type { ReplaySeed } from "./types";

export const MOCK_REPLAY_SEED = ${JSON.stringify(seed, null, 2)} satisfies ReplaySeed;
`;

const outputPath = path.join(projectRoot, "src/lib/replay/mock-seed.ts");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, output);
console.log(`Wrote ${outputPath} (${(output.length / 1024).toFixed(1)} KB)`);
