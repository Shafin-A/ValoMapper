import {
  AGENTS,
  DEFAULT_MAP_IDS,
  MAP_OPTIONS,
  getMapCallouts,
  getMapSpawnBarriers,
  getMapUltOrbs,
} from "@/lib/consts";
import {
  AGENT_ICON_CONFIGS,
  AGENT_ULTIMATE_COSTS,
} from "@/lib/consts/configs/agent-icon/consts";

describe("const data modules", () => {
  it("provides callouts, barriers, and orbs for every map", () => {
    for (const map of MAP_OPTIONS) {
      expect(getMapCallouts(map.id)?.callouts.length).toBeGreaterThan(0);
      expect(getMapSpawnBarriers(map.id)?.barriers.length).toBeGreaterThan(0);
      expect(getMapUltOrbs(map.id)?.orbs.length).toBeGreaterThan(0);
    }
  });

  it("provides an icon config and ultimate cost for every agent", () => {
    for (const agent of AGENTS) {
      expect(AGENT_ICON_CONFIGS[agent.name]?.length).toBeGreaterThanOrEqual(4);
      expect(typeof AGENT_ULTIMATE_COSTS[agent.name]).toBe("number");
    }
  });

  it("keeps every default map in the option list", () => {
    const mapIds = new Set(MAP_OPTIONS.map((map) => map.id));

    for (const id of DEFAULT_MAP_IDS) {
      expect(mapIds.has(id)).toBe(true);
    }
  });
});
