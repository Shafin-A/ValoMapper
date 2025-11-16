import { AbilityIconConfig, AbilityIconItem } from "@/lib/types";

export const AGENT_ICON_CONFIGS: Record<string, AbilityIconConfig> = {
  Astra: [
    {
      id: "gravity_well",
      src: "/agents/astra/gravity_well.png",
      name: "Gravity Well",
      action: "astra_suck",
    },
    {
      id: "nova_pulse",
      src: "/agents/astra/nova_pulse.png",
      name: "Nova Pulse",
      action: "astra_stun",
    },
    {
      id: "nebula__dissipate",
      src: "/agents/astra/nebula___dissipate.png",
      name: "Nebula / Dissipate",
      action: "astra_smoke",
    },
    {
      id: "cosmic_divide",
      src: "/agents/astra/cosmic_divide.png",
      name: "Cosmic Divide",
      action: "astra_ult",
    },
    {
      id: "astra_passive",
      src: "/agents/astra/astral_form.png",
      name: "Astral Star",
      action: "icon",
    },
  ],
  Breach: [
    {
      id: "aftershock",
      src: "/agents/breach/aftershock.png",
      name: "Aftershock",
      action: "breach_aftershock",
    },
    {
      id: "flashpoint",
      src: "/agents/breach/flashpoint.png",
      name: "Flashpoint",
      action: "icon",
    },
    {
      id: "fault_line",
      src: "/agents/breach/fault_line.png",
      name: "Fault Line",
      action: "breach_stun",
    },
    {
      id: "rolling_thunder",
      src: "/agents/breach/rolling_thunder.png",
      name: "Rolling Thunder",
      action: "breach_ult",
    },
  ],
  Brimstone: [
    {
      id: "stim_beacon",
      src: "/agents/brimstone/stim_beacon.png",
      name: "Stim Beacon",
      action: "brim_stim",
    },
    {
      id: "incendiary",
      src: "/agents/brimstone/incendiary.png",
      name: "Incendiary",
      action: "brim_molly",
    },
    {
      id: "sky_smoke",
      src: "/agents/brimstone/sky_smoke.png",
      name: "Sky Smoke",
      action: "brim_smoke",
    },
    {
      id: "orbital_strike",
      src: "/agents/brimstone/orbital_strike.png",
      name: "Orbital Strike",
      action: "brim_ult",
    },
  ],
  Chamber: [
    {
      id: "trademark",
      src: "/agents/chamber/trademark.png",
      name: "Trademark",
      action: "chamber_trip",
    },
    {
      id: "headhunter",
      src: "/agents/chamber/headhunter.png",
      name: "Headhunter",
      action: "icon",
    },
    {
      id: "rendezvous",
      src: "/agents/chamber/rendezvous.png",
      name: "Rendezvous",
      action: "chamber_tp",
    },
    {
      id: "tour_de_force",
      src: "/agents/chamber/tour_de_force.png",
      name: "Tour de Force",
      action: "icon",
    },
  ],
  Clove: [
    {
      id: "pick_me_up",
      src: "/agents/clove/pick_me_up.png",
      name: "Pick Me Up",
      action: "icon",
    },
    {
      id: "meddle",
      src: "/agents/clove/meddle.png",
      name: "Meddle",
      action: "clove_meddle",
    },
    {
      id: "ruse",
      src: "/agents/clove/ruse.png",
      name: "Ruse",
      action: "clove_smoke",
    },
    {
      id: "not_dead_yet",
      src: "/agents/clove/not_dead_yet.png",
      name: "Not Dead Yet",
      action: "icon",
    },
  ],
  Cypher: [
    {
      id: "trapwire",
      src: "/agents/cypher/trapwire.png",
      name: "Trapwire",
      action: "cypher_trip",
    },
    {
      id: "cyber_cage",
      src: "/agents/cypher/cyber_cage.png",
      name: "Cyber Cage",
      action: "cypher_cage",
    },
    {
      id: "spycam",
      src: "/agents/cypher/spycam.png",
      name: "Spycam",
      action: "icon",
    },
    {
      id: "neural_theft",
      src: "/agents/cypher/neural_theft.png",
      name: "Neural Theft",
      action: "icon",
    },
  ],
  Deadlock: [
    {
      id: "barrier_mesh",
      src: "/agents/deadlock/barrier_mesh.png",
      name: "Barrier Mesh",
      action: "deadlock_wall",
    },
    {
      id: "sonic_sensor",
      src: "/agents/deadlock/sonic_sensor.png",
      name: "Sonic Sensor",
      action: "deadlock_trip",
    },
    {
      id: "gravnet",
      src: "/agents/deadlock/gravnet.png",
      name: "GravNet",
      action: "deadlock_net",
    },
    {
      id: "annihilation",
      src: "/agents/deadlock/annihilation.png",
      name: "Annihilation",
      action: "icon",
    },
  ],
  Fade: [
    {
      id: "prowler",
      src: "/agents/fade/prowler.png",
      name: "Prowler",
      action: "icon",
    },
    {
      id: "seize",
      src: "/agents/fade/seize.png",
      name: "Seize",
      action: "fade_seize",
    },
    {
      id: "haunt",
      src: "/agents/fade/haunt.png",
      name: "Haunt",
      action: "fade_eye",
    },
    {
      id: "nightfall",
      src: "/agents/fade/nightfall.png",
      name: "Nightfall",
      action: "fade_ult",
    },
  ],
  Gekko: [
    {
      id: "mosh_pit",
      src: "/agents/gekko/mosh_pit.png",
      name: "Mosh Pit",
      action: "gekko_molly",
    },
    {
      id: "wingman",
      src: "/agents/gekko/wingman.png",
      name: "Wingman",
      action: "icon",
    },
    {
      id: "dizzy",
      src: "/agents/gekko/dizzy.png",
      name: "Dizzy",
      action: "icon",
    },
    {
      id: "thrash",
      src: "/agents/gekko/thrash.png",
      name: "Thrash",
      action: "icon",
    },
  ],
  Harbor: [
    {
      id: "storm_surge",
      src: "/agents/harbor/storm_surge.png",
      name: "Storm Surge",
      action: "harbor_blind",
    },
    {
      id: "high_tide",
      src: "/agents/harbor/high_tide.png",
      name: "High Tide",
      action: "harbor_wall",
    },
    {
      id: "cove",
      src: "/agents/harbor/cove.png",
      name: "Cove",
      action: "harbor_cove",
    },
    {
      id: "reckoning",
      src: "/agents/harbor/reckoning.png",
      name: "Reckoning",
      action: "harbor_ult",
    },
  ],
  Iso: [
    {
      id: "contingency",
      src: "/agents/iso/contingency.png",
      name: "Contingency",
      action: "iso_wall",
    },
    {
      id: "undercut",
      src: "/agents/iso/undercut.png",
      name: "Undercut",
      action: "iso_vuln",
    },
    {
      id: "double_tap",
      src: "/agents/iso/double_tap.png",
      name: "Double Tap",
      action: "icon",
    },
    {
      id: "kill_contract",
      src: "/agents/iso/kill_contract.png",
      name: "Kill Contract",
      action: "iso_ult",
    },
  ],
  Jett: [
    {
      id: "cloudburst",
      src: "/agents/jett/cloudburst.png",
      name: "Cloudburst",
      action: "jett_smoke",
    },
    {
      id: "updraft",
      src: "/agents/jett/updraft.png",
      name: "Updraft",
      action: "icon",
    },
    {
      id: "tailwind",
      src: "/agents/jett/tailwind.png",
      name: "Tailwind",
      action: "icon",
    },
    {
      id: "blade_storm",
      src: "/agents/jett/blade_storm.png",
      name: "Blade Storm",
      action: "icon",
    },
  ],
  "KAY/O": [
    {
      id: "fragment",
      src: "/agents/kayo/fragment.png",
      name: "FRAG/ment",
      action: "kayo_molly",
    },
    {
      id: "flashdrive",
      src: "/agents/kayo/flashdrive.png",
      name: "FLASH/drive",
      action: "icon",
    },
    {
      id: "zeropoint",
      src: "/agents/kayo/zeropoint.png",
      name: "ZERO/point",
      action: "kayo_knife",
    },
    {
      id: "nullcmd",
      src: "/agents/kayo/nullcmd.png",
      name: "NULL/cmd",
      action: "kayo_ult",
    },
  ],
  Killjoy: [
    {
      id: "nanoswarm",
      src: "/agents/killjoy/nanoswarm.png",
      name: "Nanoswarm",
      action: "kj_molly",
    },
    {
      id: "alarmbot",
      src: "/agents/killjoy/alarmbot.png",
      name: "Alarmbot",
      action: "kj_alarmbot",
    },
    {
      id: "turret",
      src: "/agents/killjoy/turret.png",
      name: "Turret",
      action: "kj_turret",
    },
    {
      id: "lockdown",
      src: "/agents/killjoy/lockdown.png",
      name: "Lockdown",
      action: "kj_ult",
    },
  ],
  Neon: [
    {
      id: "fast_lane",
      src: "/agents/neon/fast_lane.png",
      name: "Fast Lane",
      action: "neon_wall",
    },
    {
      id: "relay_bolt",
      src: "/agents/neon/relay_bolt.png",
      name: "Relay Bolt",
      action: "neon_stun",
    },
    {
      id: "high_gear",
      src: "/agents/neon/high_gear.png",
      name: "High Gear",
      action: "icon",
    },
    {
      id: "overdrive",
      src: "/agents/neon/overdrive.png",
      name: "Overdrive",
      action: "icon",
    },
  ],
  Omen: [
    {
      id: "shrouded_step",
      src: "/agents/omen/shrouded_step.png",
      name: "Shrouded Step",
      action: "icon",
    },
    {
      id: "paranoia",
      src: "/agents/omen/paranoia.png",
      name: "Paranoia",
      action: "omen_blind",
    },
    {
      id: "dark_cover",
      src: "/agents/omen/dark_cover.png",
      name: "Dark Cover",
      action: "omen_smoke",
    },
    {
      id: "from_the_shadows",
      src: "/agents/omen/from_the_shadows.png",
      name: "From the Shadows",
      action: "icon",
    },
  ],
  Phoenix: [
    {
      id: "blaze",
      src: "/agents/phoenix/blaze.png",
      name: "Blaze",
      action: "phoenix_wall",
    },
    {
      id: "hot_hands",
      src: "/agents/phoenix/hot_hands.png",
      name: "Hot Hands",
      action: "phoenix_molly",
    },
    {
      id: "curveball",
      src: "/agents/phoenix/curveball.png",
      name: "Curveball",
      action: "icon",
    },
    {
      id: "run_it_back",
      src: "/agents/phoenix/run_it_back.png",
      name: "Run it Back",
      action: "icon",
    },
  ],
  Raze: [
    {
      id: "boom_bot",
      src: "/agents/raze/boom_bot.png",
      name: "Boom Bot",
      action: "icon",
    },
    {
      id: "blast_pack",
      src: "/agents/raze/blast_pack.png",
      name: "Blast Pack",
      action: "icon",
    },
    {
      id: "paint_shells",
      src: "/agents/raze/paint_shells.png",
      name: "Paint Shells",
      action: "icon",
    },
    {
      id: "showstopper",
      src: "/agents/raze/showstopper.png",
      name: "Showstopper",
      action: "icon",
    },
  ],
  Reyna: [
    {
      id: "leer",
      src: "/agents/reyna/leer.png",
      name: "Leer",
      action: "icon",
    },
    {
      id: "devour",
      src: "/agents/reyna/devour.png",
      name: "Devour",
      action: "icon",
    },
    {
      id: "dismiss",
      src: "/agents/reyna/dismiss.png",
      name: "Dismiss",
      action: "icon",
    },
    {
      id: "empress",
      src: "/agents/reyna/empress.png",
      name: "Empress",
      action: "icon",
    },
  ],
  Sage: [
    {
      id: "barrier_orb",
      src: "/agents/sage/barrier_orb.png",
      name: "Barrier Orb",
      action: "sage_wall",
    },
    {
      id: "slow_orb",
      src: "/agents/sage/slow_orb.png",
      name: "Slow Orb",
      action: "icon",
    },
    {
      id: "healing_orb",
      src: "/agents/sage/healing_orb.png",
      name: "Healing Orb",
      action: "icon",
    },
    {
      id: "resurrection",
      src: "/agents/sage/resurrection.png",
      name: "Resurrection",
      action: "icon",
    },
  ],
  Skye: [
    {
      id: "regrowth",
      src: "/agents/skye/regrowth.png",
      name: "Regrowth",
      action: "skye_heal",
    },
    {
      id: "trailblazer",
      src: "/agents/skye/trailblazer.png",
      name: "Trailblazer",
      action: "icon",
    },
    {
      id: "guiding_light",
      src: "/agents/skye/guiding_light.png",
      name: "Guiding Light",
      action: "icon",
    },
    {
      id: "seekers",
      src: "/agents/skye/seekers.png",
      name: "Seekers",
      action: "icon",
    },
  ],
  Sova: [
    {
      id: "owl_drone",
      src: "/agents/sova/owl_drone.png",
      name: "Owl Drone",
      action: "icon",
    },
    {
      id: "shock_bolt",
      src: "/agents/sova/shock_bolt.png",
      name: "Shock Bolt",
      action: "sova_shock_dart",
    },
    {
      id: "recon_bolt",
      src: "/agents/sova/recon_bolt.png",
      name: "Recon Bolt",
      action: "sova_dart",
    },
    {
      id: "hunters_fury",
      src: "/agents/sova/hunter's_fury.png",
      name: "Hunter's Fury",
      action: "sova_ult",
    },
  ],
  Tejo: [
    {
      id: "stealth_drone",
      src: "/agents/tejo/stealth_drone.png",
      name: "Stealth Drone",
      action: "tejo_drone",
    },
    {
      id: "special_delivery",
      src: "/agents/tejo/special_delivery.png",
      name: "Special Delivery",
      action: "tejo_stun",
    },
    {
      id: "guided_salvo",
      src: "/agents/tejo/guided_salvo.png",
      name: "Guided Salvo",
      action: "tejo_missile",
    },
    {
      id: "armageddon",
      src: "/agents/tejo/armageddon.png",
      name: "Armageddon",
      action: "tejo_ult",
    },
  ],
  Veto: [
    {
      id: "crosscut",
      src: "/agents/veto/crosscut.png",
      name: "Crosscut",
      action: "veto_teleport",
    },
    {
      id: "chokehold",
      src: "/agents/veto/chokehold.png",
      name: "Chokehold",
      action: "veto_molly",
    },
    {
      id: "interceptor",
      src: "/agents/veto/interceptor.png",
      name: "Interceptor",
      action: "veto_interceptor",
    },
    {
      id: "evolution",
      src: "/agents/veto/evolution.png",
      name: "Evolution",
      action: "icon",
    },
  ],
  Viper: [
    {
      id: "snake_bite",
      src: "/agents/viper/snake_bite.png",
      name: "Snake Bite",
      action: "viper_molly",
    },
    {
      id: "poison_cloud",
      src: "/agents/viper/poison_cloud.png",
      name: "Poison Cloud",
      action: "viper_smoke",
    },
    {
      id: "toxic_screen",
      src: "/agents/viper/toxic_screen.png",
      name: "Toxic Screen",
      action: "viper_wall",
    },
    {
      id: "vipers_pit",
      src: "/agents/viper/viper's_pit.png",
      name: "Viper's Pit",
      action: "icon",
    },
  ],
  Vyse: [
    {
      id: "razorvine",
      src: "/agents/vyse/razorvine.png",
      name: "Razor Vine",
      action: "vyse_slow",
    },
    {
      id: "shear",
      src: "/agents/vyse/shear.png",
      name: "Shear",
      action: "vyse_wall",
    },
    {
      id: "arc_rose",
      src: "/agents/vyse/arc_rose.png",
      name: "Arc Rose",
      action: "icon",
    },
    {
      id: "steel_garden",
      src: "/agents/vyse/steel_garden.png",
      name: "Steel Garden",
      action: "vyse_ult",
    },
  ],
  Waylay: [
    {
      id: "saturate",
      src: "/agents/waylay/saturate.png",
      name: "Saturate",
      action: "waylay_slow",
    },
    {
      id: "lightspeed",
      src: "/agents/waylay/lightspeed.png",
      name: "Lightspeed",
      action: "icon",
    },
    {
      id: "refract",
      src: "/agents/waylay/refract.png",
      name: "Refract",
      action: "icon",
    },
    {
      id: "convergent_paths",
      src: "/agents/waylay/convergent_paths.png",
      name: "Convergent Paths",
      action: "waylay_ult",
    },
  ],
  Yoru: [
    {
      id: "fakeout",
      src: "/agents/yoru/fakeout.png",
      name: "Fakeout",
      action: "icon",
    },
    {
      id: "blindside",
      src: "/agents/yoru/blindside.png",
      name: "Blindside",
      action: "icon",
    },
    {
      id: "gatecrash",
      src: "/agents/yoru/gatecrash.png",
      name: "Gatecrash",
      action: "icon",
    },
    {
      id: "dimensional_drift",
      src: "/agents/yoru/dimensional_drift.png",
      name: "Dimensional Drift",
      action: "icon",
    },
  ],
};

export const ABILITY_LOOKUP: Record<string, AbilityIconItem> = Object.values(
  AGENT_ICON_CONFIGS
)
  .flatMap((items: AbilityIconItem[]) => items)
  .reduce((acc, ability) => {
    acc[ability.name] = ability;
    return acc;
  }, {} as Record<string, AbilityIconItem>);
