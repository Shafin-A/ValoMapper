import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  EMPTY_VALORANT_TERMS,
  getLocalizedAbilityName,
  getLocalizedAgentName,
  getLocalizedMapName,
  getLocalizedRoleName,
  getLocalizedWeaponName,
  type ValorantTermData,
} from "@/lib/i18n/valorant-terms";

const TERMS_DIR = path.join(
  process.cwd(),
  "src",
  "lib",
  "consts",
  "data",
  "valorant-i18n",
);

const readTerms = (locale: string): ValorantTermData =>
  JSON.parse(
    readFileSync(path.join(TERMS_DIR, `${locale}.json`), "utf8"),
  ) as ValorantTermData;

describe("Valorant term snapshots", () => {
  it("contains one snapshot for each of the 18 valorant-api locales", () => {
    const files = readdirSync(TERMS_DIR)
      .filter((file) => file.endsWith(".json"))
      .map((file) => file.replace(/\.json$/, ""))
      .sort();

    expect(files).toEqual(
      [
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
      ].sort(),
    );
  });

  it("keeps the same key set in every locale", () => {
    const enUS = readTerms("en-US");
    const locales = readdirSync(TERMS_DIR)
      .filter((file) => file.endsWith(".json"))
      .map((file) => file.replace(/\.json$/, ""));

    for (const locale of locales) {
      const terms = readTerms(locale);
      expect({
        locale,
        agents: Object.keys(terms.agents).sort(),
        abilities: Object.keys(terms.abilities).sort(),
        maps: Object.keys(terms.maps).sort(),
        roles: Object.keys(terms.roles).sort(),
        weapons: Object.keys(terms.weapons).sort(),
      }).toEqual({
        locale,
        agents: Object.keys(enUS.agents).sort(),
        abilities: Object.keys(enUS.abilities).sort(),
        maps: Object.keys(enUS.maps).sort(),
        roles: Object.keys(enUS.roles).sort(),
        weapons: Object.keys(enUS.weapons).sort(),
      });
    }
  });

  it("resolves localized agent, role, ability, map and weapon names", () => {
    const ja = readTerms("ja-JP");

    expect(getLocalizedAgentName(ja, "Gekko")).toBe("ゲッコー");
    expect(getLocalizedRoleName(ja, "Initiator")).toBe("イニシエーター");
    expect(getLocalizedAbilityName(ja, "Gekko", "Ability1", "Wingman")).toBe(
      "ウィングマン",
    );
    expect(getLocalizedMapName(ja, "ascent", "Ascent")).toBe("アセント");
    expect(getLocalizedWeaponName(ja, "vandal", "Vandal")).toBe("ヴァンダル");
  });

  it("falls back to canonical names when a term is missing", () => {
    expect(getLocalizedAgentName(EMPTY_VALORANT_TERMS, "Jett")).toBe("Jett");
    expect(
      getLocalizedAbilityName(EMPTY_VALORANT_TERMS, "Jett", "Ultimate", "Blade Storm"),
    ).toBe("Blade Storm");
    expect(getLocalizedMapName(EMPTY_VALORANT_TERMS, "bind", "Bind")).toBe(
      "Bind",
    );
    expect(getLocalizedWeaponName(EMPTY_VALORANT_TERMS, "vandal", "Vandal")).toBe(
      "Vandal",
    );
  });

  it("covers every app agent, map and weapon", () => {
    const enUS = readTerms("en-US");
    const agentConfigs = JSON.parse(
      readFileSync(
        path.join(
          process.cwd(),
          "src",
          "lib",
          "consts",
          "data",
          "agent-icon-configs.json",
        ),
        "utf8",
      ),
    ) as Record<string, unknown>;
    const maps = JSON.parse(
      readFileSync(
        path.join(
          process.cwd(),
          "src",
          "lib",
          "consts",
          "data",
          "maps.json",
        ),
        "utf8",
      ),
    ) as { mapOptions: { id: string }[] };

    for (const agent of Object.keys(agentConfigs)) {
      if (agent === "VisionCones") continue;
      expect(enUS.agents[agent]?.name).toBeTruthy();
      expect(enUS.abilities[agent]).toBeTruthy();
    }

    for (const map of maps.mapOptions) {
      expect(enUS.maps[map.id]).toBeTruthy();
    }

    expect(Object.keys(enUS.weapons)).toHaveLength(21);
  });
});
