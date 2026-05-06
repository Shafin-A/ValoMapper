import {
  AbilityAlternate,
  AbilityIconConfig,
  AbilityIconDefinition,
  AbilityIconItem,
} from "@/lib/types";

export const AGENT_ICON_CONFIGS: Record<string, AbilityIconConfig> = {
  Astra: [
    {
      id: "gravity_well",
      src: "/agents/astra/gravity_well.png",
      name: "Gravity Well",
      action: "astra_suck",
      slot: "Grenade",
    },
    {
      id: "nova_pulse",
      src: "/agents/astra/nova_pulse.png",
      name: "Nova Pulse",
      action: "astra_stun",
      slot: "Ability1",
    },
    {
      id: "nebula__dissipate",
      src: "/agents/astra/nebula___dissipate.png",
      name: "Nebula / Dissipate",
      action: "astra_smoke",
      slot: "Ability2",
    },
    {
      id: "cosmic_divide",
      src: "/agents/astra/cosmic_divide.png",
      name: "Cosmic Divide",
      action: "astra_ult",
      slot: "Ultimate",
    },
    {
      id: "astra_passive",
      src: "/agents/astra/astral_form.png",
      name: "Astral Star",
      action: "icon",
      slot: "Passive",
    },
  ],
  Breach: [
    {
      id: "aftershock",
      src: "/agents/breach/aftershock.png",
      name: "Aftershock",
      action: "breach_aftershock",
      slot: "Grenade",
    },
    {
      id: "flashpoint",
      src: "/agents/breach/flashpoint.png",
      name: "Flashpoint",
      action: "icon",
      slot: "Ability1",
    },
    {
      id: "fault_line",
      src: "/agents/breach/fault_line.png",
      name: "Fault Line",
      action: "breach_stun",
      slot: "Ability2",
    },
    {
      id: "rolling_thunder",
      src: "/agents/breach/rolling_thunder.png",
      name: "Rolling Thunder",
      action: "breach_ult",
      slot: "Ultimate",
    },
  ],
  Brimstone: [
    {
      id: "stim_beacon",
      src: "/agents/brimstone/stim_beacon.png",
      name: "Stim Beacon",
      action: "brim_stim",
      slot: "Grenade",
    },
    {
      id: "incendiary",
      src: "/agents/brimstone/incendiary.png",
      name: "Incendiary",
      action: "brim_molly",
      slot: "Ability1",
    },
    {
      id: "sky_smoke",
      src: "/agents/brimstone/sky_smoke.png",
      name: "Sky Smoke",
      action: "brim_smoke",
      slot: "Ability2",
    },
    {
      id: "orbital_strike",
      src: "/agents/brimstone/orbital_strike.png",
      name: "Orbital Strike",
      action: "brim_ult",
      slot: "Ultimate",
    },
  ],
  Chamber: [
    {
      id: "trademark",
      src: "/agents/chamber/trademark.png",
      name: "Trademark",
      action: "chamber_trip",
      slot: "Grenade",
    },
    {
      id: "headhunter",
      src: "/agents/chamber/headhunter.png",
      name: "Headhunter",
      action: "icon",
      slot: "Ability1",
    },
    {
      id: "rendezvous",
      src: "/agents/chamber/rendezvous.png",
      name: "Rendezvous",
      action: "chamber_tp",
      slot: "Ability2",
    },
    {
      id: "tour_de_force",
      src: "/agents/chamber/tour_de_force.png",
      name: "Tour de Force",
      action: "icon",
      slot: "Ultimate",
    },
  ],
  Clove: [
    {
      id: "pick_me_up",
      src: "/agents/clove/pick_me_up.png",
      name: "Pick Me Up",
      action: "icon",
      slot: "Grenade",
    },
    {
      id: "meddle",
      src: "/agents/clove/meddle.png",
      name: "Meddle",
      action: "clove_meddle",
      slot: "Ability1",
    },
    {
      id: "ruse",
      src: "/agents/clove/ruse.png",
      name: "Ruse",
      action: "clove_smoke",
      slot: "Ability2",
    },
    {
      id: "not_dead_yet",
      src: "/agents/clove/not_dead_yet.png",
      name: "Not Dead Yet",
      action: "icon",
      slot: "Ultimate",
    },
  ],
  Cypher: [
    {
      id: "trapwire",
      src: "/agents/cypher/trapwire.png",
      name: "Trapwire",
      action: "cypher_trip",
      slot: "Grenade",
    },
    {
      id: "cyber_cage",
      src: "/agents/cypher/cyber_cage.png",
      name: "Cyber Cage",
      action: "cypher_cage",
      slot: "Ability1",
    },
    {
      id: "spycam",
      src: "/agents/cypher/spycam.png",
      name: "Spycam",
      action: "icon",
      slot: "Ability2",
    },
    {
      id: "neural_theft",
      src: "/agents/cypher/neural_theft.png",
      name: "Neural Theft",
      action: "icon",
      slot: "Ultimate",
    },
  ],
  Deadlock: [
    {
      id: "barrier_mesh",
      src: "/agents/deadlock/barrier_mesh.png",
      name: "Barrier Mesh",
      action: "deadlock_wall",
      slot: "Grenade",
    },
    {
      id: "sonic_sensor",
      src: "/agents/deadlock/sonic_sensor.png",
      name: "Sonic Sensor",
      action: "deadlock_trip",
      slot: "Ability1",
    },
    {
      id: "gravnet",
      src: "/agents/deadlock/gravnet.png",
      name: "GravNet",
      action: "deadlock_net",
      slot: "Ability2",
    },
    {
      id: "annihilation",
      src: "/agents/deadlock/annihilation.png",
      name: "Annihilation",
      action: "icon",
      slot: "Ultimate",
    },
  ],
  Fade: [
    {
      id: "prowler",
      src: "/agents/fade/prowler.png",
      name: "Prowler",
      action: "icon",
      slot: "Grenade",
    },
    {
      id: "seize",
      src: "/agents/fade/seize.png",
      name: "Seize",
      action: "fade_seize",
      slot: "Ability1",
    },
    {
      id: "haunt",
      src: "/agents/fade/haunt.png",
      name: "Haunt",
      action: "fade_eye",
      slot: "Ability2",
    },
    {
      id: "nightfall",
      src: "/agents/fade/nightfall.png",
      name: "Nightfall",
      action: "fade_ult",
      slot: "Ultimate",
    },
  ],
  Gekko: [
    {
      id: "mosh_pit",
      src: "/agents/gekko/mosh_pit.png",
      name: "Mosh Pit",
      action: "gekko_molly",
      slot: "Grenade",
    },
    {
      id: "wingman",
      src: "/agents/gekko/wingman.png",
      name: "Wingman",
      action: "icon",
      slot: "Ability1",
    },
    {
      id: "dizzy",
      src: "/agents/gekko/dizzy.png",
      name: "Dizzy",
      action: "icon",
      slot: "Ability2",
    },
    {
      id: "thrash",
      src: "/agents/gekko/thrash.png",
      name: "Thrash",
      action: "icon",
      slot: "Ultimate",
    },
  ],
  Harbor: [
    {
      id: "storm_surge",
      src: "/agents/harbor/storm_surge.png",
      name: "Storm Surge",
      action: "harbor_blind",
      slot: "Grenade",
    },
    {
      id: "high_tide",
      src: "/agents/harbor/high_tide.png",
      name: "High Tide",
      action: "harbor_wall",
      slot: "Ability1",
    },
    {
      id: "cove",
      src: "/agents/harbor/cove.png",
      name: "Cove",
      action: "harbor_cove",
      slot: "Ability2",
    },
    {
      id: "reckoning",
      src: "/agents/harbor/reckoning.png",
      name: "Reckoning",
      action: "harbor_ult",
      slot: "Ultimate",
    },
  ],
  Iso: [
    {
      id: "contingency",
      src: "/agents/iso/contingency.png",
      name: "Contingency",
      action: "iso_wall",
      slot: "Grenade",
    },
    {
      id: "undercut",
      src: "/agents/iso/undercut.png",
      name: "Undercut",
      action: "iso_vuln",
      slot: "Ability1",
    },
    {
      id: "double_tap",
      src: "/agents/iso/double_tap.png",
      name: "Double Tap",
      action: "icon",
      slot: "Ability2",
    },
    {
      id: "kill_contract",
      src: "/agents/iso/kill_contract.png",
      name: "Kill Contract",
      action: "iso_ult",
      slot: "Ultimate",
    },
  ],
  Jett: [
    {
      id: "cloudburst",
      src: "/agents/jett/cloudburst.png",
      name: "Cloudburst",
      action: "jett_smoke",
      slot: "Grenade",
    },
    {
      id: "updraft",
      src: "/agents/jett/updraft.png",
      name: "Updraft",
      action: "icon",
      slot: "Ability1",
    },
    {
      id: "tailwind",
      src: "/agents/jett/tailwind.png",
      name: "Tailwind",
      action: "icon",
      slot: "Ability2",
    },
    {
      id: "blade_storm",
      src: "/agents/jett/blade_storm.png",
      name: "Blade Storm",
      action: "icon",
      slot: "Ultimate",
    },
  ],
  "KAY/O": [
    {
      id: "fragment",
      src: "/agents/kayo/fragment.png",
      name: "FRAG/ment",
      action: "kayo_molly",
      slot: "Grenade",
    },
    {
      id: "flashdrive",
      src: "/agents/kayo/flashdrive.png",
      name: "FLASH/drive",
      action: "icon",
      slot: "Ability1",
    },
    {
      id: "zeropoint",
      src: "/agents/kayo/zeropoint.png",
      name: "ZERO/point",
      action: "kayo_knife",
      slot: "Ability2",
    },
    {
      id: "nullcmd",
      src: "/agents/kayo/nullcmd.png",
      name: "NULL/cmd",
      action: "kayo_ult",
      slot: "Ultimate",
    },
  ],
  Killjoy: [
    {
      id: "nanoswarm",
      src: "/agents/killjoy/nanoswarm.png",
      name: "Nanoswarm",
      action: "kj_molly",
      slot: "Grenade",
    },
    {
      id: "alarmbot",
      src: "/agents/killjoy/alarmbot.png",
      name: "Alarmbot",
      action: "kj_alarmbot",
      slot: "Ability1",
    },
    {
      id: "turret",
      src: "/agents/killjoy/turret.png",
      name: "Turret",
      action: "kj_turret",
      slot: "Ability2",
    },
    {
      id: "lockdown",
      src: "/agents/killjoy/lockdown.png",
      name: "Lockdown",
      action: "kj_ult",
      slot: "Ultimate",
    },
  ],
  Miks: [
    {
      id: "mpulse",
      src: "/agents/miks/mpulse_concuss.png",
      name: "M-Pulse Concuss",
      action: "miks_stun",
      slot: "Grenade",
      alternates: [
        {
          id: "mpulse_concuss",
          src: "/agents/miks/mpulse_heal.png",
          name: "M-Pulse Heal",
          action: "miks_heal",
          slot: "Grenade",
        },
      ],
    },
    {
      id: "harmonize",
      src: "/agents/miks/harmonize.png",
      name: "Harmonize",
      action: "icon",
      slot: "Ability1",
    },
    {
      id: "waveform",
      src: "/agents/miks/waveform.png",
      name: "Waveform",
      action: "miks_smoke",
      slot: "Ability2",
    },
    {
      id: "bassquake",
      src: "/agents/miks/bassquake.png",
      name: "Bassquake",
      action: "miks_ult",
      slot: "Ultimate",
    },
  ],
  Neon: [
    {
      id: "fast_lane",
      src: "/agents/neon/fast_lane.png",
      name: "Fast Lane",
      action: "neon_wall",
      slot: "Grenade",
    },
    {
      id: "relay_bolt",
      src: "/agents/neon/relay_bolt.png",
      name: "Relay Bolt",
      action: "neon_stun",
      slot: "Ability1",
    },
    {
      id: "high_gear",
      src: "/agents/neon/high_gear.png",
      name: "High Gear",
      action: "icon",
      slot: "Ability2",
    },
    {
      id: "overdrive",
      src: "/agents/neon/overdrive.png",
      name: "Overdrive",
      action: "icon",
      slot: "Ultimate",
    },
  ],
  Omen: [
    {
      id: "shrouded_step",
      src: "/agents/omen/shrouded_step.png",
      name: "Shrouded Step",
      action: "icon",
      slot: "Grenade",
    },
    {
      id: "paranoia",
      src: "/agents/omen/paranoia.png",
      name: "Paranoia",
      action: "omen_blind",
      slot: "Ability1",
    },
    {
      id: "dark_cover",
      src: "/agents/omen/dark_cover.png",
      name: "Dark Cover",
      action: "omen_smoke",
      slot: "Ability2",
    },
    {
      id: "from_the_shadows",
      src: "/agents/omen/from_the_shadows.png",
      name: "From the Shadows",
      action: "icon",
      slot: "Ultimate",
    },
  ],
  Phoenix: [
    {
      id: "blaze",
      src: "/agents/phoenix/blaze.png",
      name: "Blaze",
      action: "phoenix_wall",
      slot: "Grenade",
    },
    {
      id: "hot_hands",
      src: "/agents/phoenix/hot_hands.png",
      name: "Hot Hands",
      action: "phoenix_molly",
      slot: "Ability1",
    },
    {
      id: "curveball",
      src: "/agents/phoenix/curveball.png",
      name: "Curveball",
      action: "icon",
      slot: "Ability2",
    },
    {
      id: "run_it_back",
      src: "/agents/phoenix/run_it_back.png",
      name: "Run it Back",
      action: "icon",
      slot: "Ultimate",
    },
  ],
  Raze: [
    {
      id: "boom_bot",
      src: "/agents/raze/boom_bot.png",
      name: "Boom Bot",
      action: "icon",
      slot: "Grenade",
    },
    {
      id: "blast_pack",
      src: "/agents/raze/blast_pack.png",
      name: "Blast Pack",
      action: "icon",
      slot: "Ability1",
    },
    {
      id: "paint_shells",
      src: "/agents/raze/paint_shells.png",
      name: "Paint Shells",
      action: "icon",
      slot: "Ability2",
    },
    {
      id: "showstopper",
      src: "/agents/raze/showstopper.png",
      name: "Showstopper",
      action: "icon",
      slot: "Ultimate",
    },
  ],
  Reyna: [
    {
      id: "leer",
      src: "/agents/reyna/leer.png",
      name: "Leer",
      action: "icon",
      slot: "Grenade",
    },
    {
      id: "devour",
      src: "/agents/reyna/devour.png",
      name: "Devour",
      action: "icon",
      slot: "Ability1",
    },
    {
      id: "dismiss",
      src: "/agents/reyna/dismiss.png",
      name: "Dismiss",
      action: "icon",
      slot: "Ability2",
    },
    {
      id: "empress",
      src: "/agents/reyna/empress.png",
      name: "Empress",
      action: "icon",
      slot: "Ultimate",
    },
  ],
  Sage: [
    {
      id: "barrier_orb",
      src: "/agents/sage/barrier_orb.png",
      name: "Barrier Orb",
      action: "sage_wall",
      slot: "Grenade",
    },
    {
      id: "slow_orb",
      src: "/agents/sage/slow_orb.png",
      name: "Slow Orb",
      action: "icon",
      slot: "Ability1",
    },
    {
      id: "healing_orb",
      src: "/agents/sage/healing_orb.png",
      name: "Healing Orb",
      action: "icon",
      slot: "Ability2",
    },
    {
      id: "resurrection",
      src: "/agents/sage/resurrection.png",
      name: "Resurrection",
      action: "icon",
      slot: "Ultimate",
    },
  ],
  Skye: [
    {
      id: "regrowth",
      src: "/agents/skye/regrowth.png",
      name: "Regrowth",
      action: "skye_heal",
      slot: "Grenade",
    },
    {
      id: "trailblazer",
      src: "/agents/skye/trailblazer.png",
      name: "Trailblazer",
      action: "icon",
      slot: "Ability1",
    },
    {
      id: "guiding_light",
      src: "/agents/skye/guiding_light.png",
      name: "Guiding Light",
      action: "icon",
      slot: "Ability2",
    },
    {
      id: "seekers",
      src: "/agents/skye/seekers.png",
      name: "Seekers",
      action: "icon",
      slot: "Ultimate",
    },
  ],
  Sova: [
    {
      id: "owl_drone",
      src: "/agents/sova/owl_drone.png",
      name: "Owl Drone",
      action: "icon",
      slot: "Grenade",
    },
    {
      id: "shock_bolt",
      src: "/agents/sova/shock_bolt.png",
      name: "Shock Bolt",
      action: "sova_shock_dart",
      slot: "Ability1",
    },
    {
      id: "recon_bolt",
      src: "/agents/sova/recon_bolt.png",
      name: "Recon Bolt",
      action: "sova_dart",
      slot: "Ability2",
    },
    {
      id: "hunters_fury",
      src: "/agents/sova/hunter's_fury.png",
      name: "Hunter's Fury",
      action: "sova_ult",
      slot: "Ultimate",
    },
  ],
  Tejo: [
    {
      id: "stealth_drone",
      src: "/agents/tejo/stealth_drone.png",
      name: "Stealth Drone",
      action: "tejo_drone",
      slot: "Grenade",
    },
    {
      id: "special_delivery",
      src: "/agents/tejo/special_delivery.png",
      name: "Special Delivery",
      action: "tejo_stun",
      slot: "Ability1",
    },
    {
      id: "guided_salvo",
      src: "/agents/tejo/guided_salvo.png",
      name: "Guided Salvo",
      action: "tejo_missile",
      slot: "Ability2",
    },
    {
      id: "armageddon",
      src: "/agents/tejo/armageddon.png",
      name: "Armageddon",
      action: "tejo_ult",
      slot: "Ultimate",
    },
  ],
  Veto: [
    {
      id: "crosscut",
      src: "/agents/veto/crosscut.png",
      name: "Crosscut",
      action: "veto_teleport",
      slot: "Grenade",
    },
    {
      id: "chokehold",
      src: "/agents/veto/chokehold.png",
      name: "Chokehold",
      action: "veto_molly",
      slot: "Ability1",
    },
    {
      id: "interceptor",
      src: "/agents/veto/interceptor.png",
      name: "Interceptor",
      action: "veto_interceptor",
      slot: "Ability2",
    },
    {
      id: "evolution",
      src: "/agents/veto/evolution.png",
      name: "Evolution",
      action: "icon",
      slot: "Ultimate",
    },
  ],
  Viper: [
    {
      id: "snake_bite",
      src: "/agents/viper/snake_bite.png",
      name: "Snake Bite",
      action: "viper_molly",
      slot: "Grenade",
    },
    {
      id: "poison_cloud",
      src: "/agents/viper/poison_cloud.png",
      name: "Poison Cloud",
      action: "viper_smoke",
      slot: "Ability1",
    },
    {
      id: "toxic_screen",
      src: "/agents/viper/toxic_screen.png",
      name: "Toxic Screen",
      action: "viper_wall",
      slot: "Ability2",
    },
    {
      id: "vipers_pit",
      src: "/agents/viper/viper's_pit.png",
      name: "Viper's Pit",
      action: "icon",
      slot: "Ultimate",
    },
  ],
  Vyse: [
    {
      id: "razorvine",
      src: "/agents/vyse/razorvine.png",
      name: "Razor Vine",
      action: "vyse_slow",
      slot: "Grenade",
    },
    {
      id: "shear",
      src: "/agents/vyse/shear.png",
      name: "Shear",
      action: "vyse_wall",
      slot: "Ability1",
    },
    {
      id: "arc_rose",
      src: "/agents/vyse/arc_rose.png",
      name: "Arc Rose",
      action: "icon",
      slot: "Ability2",
    },
    {
      id: "steel_garden",
      src: "/agents/vyse/steel_garden.png",
      name: "Steel Garden",
      action: "vyse_ult",
      slot: "Ultimate",
    },
  ],
  Waylay: [
    {
      id: "saturate",
      src: "/agents/waylay/saturate.png",
      name: "Saturate",
      action: "waylay_slow",
      slot: "Grenade",
    },
    {
      id: "lightspeed",
      src: "/agents/waylay/lightspeed.png",
      name: "Lightspeed",
      action: "icon",
      slot: "Ability1",
    },
    {
      id: "refract",
      src: "/agents/waylay/refract.png",
      name: "Refract",
      action: "icon",
      slot: "Ability2",
    },
    {
      id: "convergent_paths",
      src: "/agents/waylay/convergent_paths.png",
      name: "Convergent Paths",
      action: "waylay_ult",
      slot: "Ultimate",
    },
  ],
  VisionCones: [
    {
      id: "vision_cone_30",
      src: "circle.svg",
      name: "Vision Cone 30",
      action: "vision_cone_30",
      slot: "",
    },
    {
      id: "vision_cone_60",
      src: "circle.svg",
      name: "Vision Cone 60",
      action: "vision_cone_60",
      slot: "",
    },
    {
      id: "vision_cone_90",
      src: "circle.svg",
      name: "Vision Cone 90",
      action: "vision_cone_90",
      slot: "",
    },
    {
      id: "vision_cone_103",
      src: "circle.svg",
      name: "Vision Cone 103",
      action: "vision_cone_103",
      slot: "",
    },
  ],
  Yoru: [
    {
      id: "fakeout",
      src: "/agents/yoru/fakeout.png",
      name: "Fakeout",
      action: "icon",
      slot: "Grenade",
    },
    {
      id: "blindside",
      src: "/agents/yoru/blindside.png",
      name: "Blindside",
      action: "icon",
      slot: "Ability1",
    },
    {
      id: "gatecrash",
      src: "/agents/yoru/gatecrash.png",
      name: "Gatecrash",
      action: "icon",
      slot: "Ability2",
    },
    {
      id: "dimensional_drift",
      src: "/agents/yoru/dimensional_drift.png",
      name: "Dimensional Drift",
      action: "icon",
      slot: "Ultimate",
    },
  ],
};

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
