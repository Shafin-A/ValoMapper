#!/usr/bin/env node
// App data stays canonical English; these snapshots are render-time translations.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const APP_ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const OUTPUT_DIR = path.join(
  APP_ROOT,
  "src",
  "lib",
  "consts",
  "data",
  "valorant-i18n",
);

const API_BASE = "https://valorant-api.com/v1";
const EXPECTED_LOCALES = [
  "ar-AE",
  "de-DE",
  "en-US",
  "es-ES",
  "es-MX",
  "fr-FR",
  "id-ID",
  "it-IT",
  "ja-JP",
  "ko-KR",
  "pl-PL",
  "pt-BR",
  "ru-RU",
  "th-TH",
  "tr-TR",
  "vi-VN",
  "zh-CN",
  "zh-TW",
];

const warnings = [];

const warn = (message) => {
  warnings.push(message);
  console.warn(`[warn] ${message}`);
};

const fetchApi = async (endpoint) => {
  const response = await fetch(`${API_BASE}/${endpoint}?language=all`);
  if (!response.ok) {
    throw new Error(`${endpoint} returned HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (payload.status !== 200 || !payload.data) {
    throw new Error(`${endpoint} returned an invalid payload`);
  }

  return payload.data;
};

const localized = (value, locale, label) => {
  if (value && typeof value === "object") {
    const exact = value[locale];
    if (typeof exact === "string" && exact.trim()) return exact;

    const fallback = value["en-US"];
    if (typeof fallback === "string" && fallback.trim()) {
      warn(`${label} is missing ${locale}; fell back to en-US`);
      return fallback;
    }
  }

  if (typeof value === "string" && value.trim()) return value;
  return null;
};

const readAppMaps = async () => {
  const file = path.join(
    APP_ROOT,
    "src",
    "lib",
    "consts",
    "data",
    "maps.json",
  );
  const data = JSON.parse(await readFile(file, "utf8"));
  return data.mapOptions;
};

const readAppWeaponSlugs = async () => {
  const file = path.join(
    APP_ROOT,
    "src",
    "lib",
    "consts",
    "misc",
    "consts.ts",
  );
  const source = await readFile(file, "utf8");
  const block = source.match(/export const WEAPONS = (\{[\s\S]*?\});/);
  if (!block) {
    throw new Error("Could not locate the WEAPONS constant");
  }

  return [...block[1].matchAll(/name:\s*"([^"]+)"/g)].map(
    (match) => match[1],
  );
};

const main = async () => {
  const [agentData, mapData, weaponData, versionData] = await Promise.all([
    fetchApi("agents"),
    fetchApi("maps"),
    fetchApi("weapons"),
    fetchApi("version").catch((error) => {
      warn(`Could not load /v1/version: ${error.message}`);
      return null;
    }),
  ]);

  const playableAgents = agentData.filter((agent) => agent.isPlayableCharacter);
  const appMaps = await readAppMaps();
  const appWeaponSlugs = await readAppWeaponSlugs();

  const mapByName = new Map(
    mapData
      .filter((map) => map.displayName?.["en-US"])
      .map((map) => [map.displayName["en-US"], map]),
  );
  const weaponByName = new Map(
    weaponData
      .filter((weapon) => weapon.displayName?.["en-US"])
      .map((weapon) => [weapon.displayName["en-US"].toLowerCase(), weapon]),
  );

  // The app calls the melee slot "knife"; the API calls it "Melee".
  const weaponAliases = { knife: "melee" };
  const findWeapon = (slug) =>
    weaponByName.get(slug) ?? weaponByName.get(weaponAliases[slug] ?? "");

  const localAgentNames = new Set(
    Object.keys(
      JSON.parse(
        await readFile(
          path.join(
            APP_ROOT,
            "src",
            "lib",
            "consts",
            "data",
            "agent-icon-configs.json",
          ),
          "utf8",
        ),
      ),
    ),
  );

  const apiAgentNames = new Set(
    playableAgents.map((agent) => agent.displayName["en-US"]),
  );

  for (const name of localAgentNames) {
    if (name !== "VisionCones" && !apiAgentNames.has(name)) {
      warn(`Local agent "${name}" is not present in valorant-api.com`);
    }
  }

  const baseTerms = {
    agents: {},
    roles: {},
    abilities: {},
  };

  for (const agent of playableAgents) {
    const canonicalName = agent.displayName["en-US"];
    const roleName = agent.role?.displayName?.["en-US"];

    baseTerms.agents[canonicalName] = {
      name: agent.displayName,
      role: agent.role?.displayName ?? null,
    };

    if (roleName) {
      baseTerms.roles[roleName] = agent.role.displayName;
    }

    baseTerms.abilities[canonicalName] = {};
    for (const ability of agent.abilities ?? []) {
      if (!ability.slot || !ability.displayName) continue;
      baseTerms.abilities[canonicalName][ability.slot] = ability.displayName;
    }
  }

  for (const appMap of appMaps) {
    if (!mapByName.has(appMap.text)) {
      warn(`Map "${appMap.text}" is not present in valorant-api.com`);
    }
  }

  for (const slug of appWeaponSlugs) {
    if (!findWeapon(slug)) {
      warn(`Weapon "${slug}" is not present in valorant-api.com`);
    }
  }

  await mkdir(OUTPUT_DIR, { recursive: true });

  const generatedAt = new Date().toISOString();
  const riotClientVersion = versionData?.riotClientVersion ?? null;

  for (const locale of EXPECTED_LOCALES) {
    const agents = {};
    for (const [canonicalName, entry] of Object.entries(baseTerms.agents)) {
      agents[canonicalName] = {
        name:
          localized(entry.name, locale, `agent ${canonicalName}`) ??
          canonicalName,
        role:
          localized(entry.role, locale, `role for ${canonicalName}`) ?? "",
      };
    }

    const roles = {};
    for (const [canonicalRole, value] of Object.entries(baseTerms.roles)) {
      roles[canonicalRole] =
        localized(value, locale, `role ${canonicalRole}`) ?? canonicalRole;
    }

    const abilities = {};
    for (const [canonicalName, slots] of Object.entries(
      baseTerms.abilities,
    )) {
      abilities[canonicalName] = {};
      for (const [slot, value] of Object.entries(slots)) {
        abilities[canonicalName][slot] =
          localized(value, locale, `${canonicalName} ${slot}`) ?? slot;
      }
    }

    const maps = {};
    for (const appMap of appMaps) {
      const apiMap = mapByName.get(appMap.text);
      maps[appMap.id] = apiMap
        ? (localized(apiMap.displayName, locale, `map ${appMap.id}`) ??
          appMap.text)
        : appMap.text;
    }

    const weapons = {};
    for (const slug of appWeaponSlugs) {
      const weapon = findWeapon(slug);
      weapons[slug] = weapon
        ? (localized(weapon.displayName, locale, `weapon ${slug}`) ?? slug)
        : slug;
    }

    const output = {
      _meta: {
        source: "valorant-api.com",
        generatedAt,
        riotClientVersion,
        locales: EXPECTED_LOCALES,
      },
      agents,
      roles,
      abilities,
      maps,
      weapons,
    };

    await writeFile(
      path.join(OUTPUT_DIR, `${locale}.json`),
      `${JSON.stringify(output, null, 2)}\n`,
      "utf8",
    );

    console.log(
      `[ok] ${locale}: ${Object.keys(agents).length} agents, ${Object.keys(abilities).length} ability sets, ${Object.keys(maps).length} maps, ${Object.keys(weapons).length} weapons`,
    );
  }

  if (warnings.length > 0) {
    console.warn(
      `\nGenerated with ${warnings.length} warning(s). Review the [warn] lines above.`,
    );
  } else {
    console.log("\nGenerated without warnings.");
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
