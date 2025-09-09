import { Agent, AbilityIconConfig, CircleAbility } from "./types";

export const DRAG_ID = -1;

export const ASCENT_MAP = "/maps/ascent.svg";
export const SIDEBAR_WIDTH = "20rem";
export const SCALE_FACTOR = 1.25;
export const MAP_SIZE = 1000;

export const AGENTS: Agent[] = [
  { name: "Astra", src: "/agents/astra/astra.png", role: "Controller" },
  { name: "Breach", src: "/agents/breach/breach.png", role: "Initiator" },
  {
    name: "Brimstone",
    src: "/agents/brimstone/brimstone.png",
    role: "Controller",
  },
  { name: "Chamber", src: "/agents/chamber/chamber.png", role: "Sentinel" },
  { name: "Clove", src: "/agents/clove/clove.png", role: "Controller" },
  { name: "Cypher", src: "/agents/cypher/cypher.png", role: "Sentinel" },
  { name: "Deadlock", src: "/agents/deadlock/deadlock.png", role: "Sentinel" },
  { name: "Fade", src: "/agents/fade/fade.png", role: "Initiator" },
  { name: "Gekko", src: "/agents/gekko/gekko.png", role: "Initiator" },
  { name: "Harbor", src: "/agents/harbor/harbor.png", role: "Controller" },
  { name: "Iso", src: "/agents/iso/iso.png", role: "Duelist" },
  { name: "Jett", src: "/agents/jett/jett.png", role: "Duelist" },
  { name: "KAY/O", src: "/agents/kayo/kayo.png", role: "Initiator" },
  { name: "Killjoy", src: "/agents/killjoy/killjoy.png", role: "Sentinel" },
  { name: "Neon", src: "/agents/neon/neon.png", role: "Duelist" },
  { name: "Omen", src: "/agents/omen/omen.png", role: "Controller" },
  { name: "Phoenix", src: "/agents/phoenix/phoenix.png", role: "Duelist" },
  { name: "Raze", src: "/agents/raze/raze.png", role: "Duelist" },
  { name: "Reyna", src: "/agents/reyna/reyna.png", role: "Duelist" },
  { name: "Sage", src: "/agents/sage/sage.png", role: "Sentinel" },
  { name: "Skye", src: "/agents/skye/skye.png", role: "Initiator" },
  { name: "Sova", src: "/agents/sova/sova.png", role: "Initiator" },
  { name: "Tejo", src: "/agents/tejo/tejo.png", role: "Initiator" },
  { name: "Viper", src: "/agents/viper/viper.png", role: "Controller" },
  { name: "Vyse", src: "/agents/vyse/vyse.png", role: "Sentinel" },
  { name: "Waylay", src: "/agents/waylay/waylay.png", role: "Duelist" },
  { name: "Yoru", src: "/agents/yoru/yoru.png", role: "Duelist" },
];

export const ROLE_ICONS: Record<string, string> = {
  Controller: "/roles/controller.png",
  Duelist: "/roles/duelist.png",
  Initiator: "/roles/initiator.png",
  Sentinel: "/roles/sentinel.png",
};

export const AGENT_ICON_CONFIGS: Record<string, AbilityIconConfig> = {
  Astra: [
    {
      id: "nova_pulse",
      src: "/agents/astra/nova_pulse.png",
      name: "Nova Pulse",
      action: "astra_stun",
    },
    {
      id: "gravity_well",
      src: "/agents/astra/gravity_well.png",
      name: "Gravity Well",
      action: "astra_suck",
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
      action: "draggable",
    },
    {
      id: "astra_passive",
      src: "/agents/astra/astral_form.png",
      name: "Astral Star",
      action: "draggable",
    },
  ],
  Breach: [
    {
      id: "aftershock",
      src: "/agents/breach/aftershock.png",
      name: "Aftershock",
      action: "draggable",
    },
    {
      id: "fault_line",
      src: "/agents/breach/fault_line.png",
      name: "Fault Line",
      action: "draggable",
    },
    {
      id: "flashpoint",
      src: "/agents/breach/flashpoint.png",
      name: "Flashpoint",
      action: "draggable",
    },
    {
      id: "rolling_thunder",
      src: "/agents/breach/rolling_thunder.png",
      name: "Rolling Thunder",
      action: "draggable",
    },
  ],
  Brimstone: [
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
      id: "stim_beacon",
      src: "/agents/brimstone/stim_beacon.png",
      name: "Stim Beacon",
      action: "brim_stim",
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
      id: "headhunter",
      src: "/agents/chamber/headhunter.png",
      name: "Headhunter",
      action: "draggable",
    },
    {
      id: "rendezvous",
      src: "/agents/chamber/rendezvous.png",
      name: "Rendezvous",
      action: "chamber_tp",
    },
    {
      id: "trademark",
      src: "/agents/chamber/trademark.png",
      name: "Trademark",
      action: "chamber_trip",
    },
    {
      id: "tour_de_force",
      src: "/agents/chamber/tour_de_force.png",
      name: "Tour de Force",
      action: "draggable",
    },
  ],
  Clove: [
    {
      id: "meddle",
      src: "/agents/clove/meddle.png",
      name: "Meddle",
      action: "clove_meddle",
    },
    {
      id: "not_dead_yet",
      src: "/agents/clove/not_dead_yet.png",
      name: "Not Dead Yet",
      action: "draggable",
    },
    {
      id: "pick_me_up",
      src: "/agents/clove/pick_me_up.png",
      name: "Pick Me Up",
      action: "draggable",
    },
    {
      id: "ruse",
      src: "/agents/clove/ruse.png",
      name: "Ruse",
      action: "clove_smoke",
    },
  ],
  Cypher: [
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
      action: "draggable",
    },
    {
      id: "trapwire",
      src: "/agents/cypher/trapwire.png",
      name: "Trapwire",
      action: "draggable",
    },
    {
      id: "neural_theft",
      src: "/agents/cypher/neural_theft.png",
      name: "Neural Theft",
      action: "draggable",
    },
  ],
  Deadlock: [
    {
      id: "barrier_mesh",
      src: "/agents/deadlock/barrier_mesh.png",
      name: "Barrier Mesh",
      action: "draggable",
    },
    {
      id: "gravnet",
      src: "/agents/deadlock/gravnet.png",
      name: "GravNet",
      action: "draggable",
    },
    {
      id: "sonic_sensor",
      src: "/agents/deadlock/sonic_sensor.png",
      name: "Sonic Sensor",
      action: "draggable",
    },
    {
      id: "annihilation",
      src: "/agents/deadlock/annihilation.png",
      name: "Annihilation",
      action: "draggable",
    },
  ],
  Fade: [
    {
      id: "prowler",
      src: "/agents/fade/prowler.png",
      name: "Prowler",
      action: "draggable",
    },
    {
      id: "seize",
      src: "/agents/fade/seize.png",
      name: "Seize",
      action: "draggable",
    },
    {
      id: "haunt",
      src: "/agents/fade/haunt.png",
      name: "Haunt",
      action: "draggable",
    },
    {
      id: "nightfall",
      src: "/agents/fade/nightfall.png",
      name: "Nightfall",
      action: "draggable",
    },
  ],
  Gekko: [
    {
      id: "wingman",
      src: "/agents/gekko/wingman.png",
      name: "Wingman",
      action: "draggable",
    },
    {
      id: "dizzy",
      src: "/agents/gekko/dizzy.png",
      name: "Dizzy",
      action: "draggable",
    },
    {
      id: "mosh_pit",
      src: "/agents/gekko/mosh_pit.png",
      name: "Mosh Pit",
      action: "draggable",
    },
    {
      id: "thrash",
      src: "/agents/gekko/thrash.png",
      name: "Thrash",
      action: "draggable",
    },
  ],
  Harbor: [
    {
      id: "cascade",
      src: "/agents/harbor/cascade.png",
      name: "Cascade",
      action: "draggable",
    },
    {
      id: "cove",
      src: "/agents/harbor/cove.png",
      name: "Cove",
      action: "harbor_cove",
    },
    {
      id: "high_tide",
      src: "/agents/harbor/high_tide.png",
      name: "High Tide",
      action: "draggable",
    },
    {
      id: "reckoning",
      src: "/agents/harbor/reckoning.png",
      name: "Reckoning",
      action: "draggable",
    },
  ],
  Iso: [
    {
      id: "undercut",
      src: "/agents/iso/undercut.png",
      name: "Undercut",
      action: "draggable",
    },
    {
      id: "double_tap",
      src: "/agents/iso/double_tap.png",
      name: "Double Tap",
      action: "draggable",
    },
    {
      id: "contingency",
      src: "/agents/iso/contingency.png",
      name: "Contingency",
      action: "draggable",
    },
    {
      id: "kill_contract",
      src: "/agents/iso/kill_contract.png",
      name: "Kill Contract",
      action: "draggable",
    },
  ],
  Jett: [
    {
      id: "updraft",
      src: "/agents/jett/updraft.png",
      name: "Updraft",
      action: "draggable",
    },
    {
      id: "tailwind",
      src: "/agents/jett/tailwind.png",
      name: "Tailwind",
      action: "draggable",
    },
    {
      id: "cloudburst",
      src: "/agents/jett/cloudburst.png",
      name: "Cloudburst",
      action: "draggable",
    },
    {
      id: "blade_storm",
      src: "/agents/jett/blade_storm.png",
      name: "Blade Storm",
      action: "draggable",
    },
  ],
  "KAY/O": [
    {
      id: "fragment",
      src: "/agents/kayo/fragment.png",
      name: "Fragment",
      action: "draggable",
    },
    {
      id: "flashdrive",
      src: "/agents/kayo/flashdrive.png",
      name: "Flash/Drive",
      action: "draggable",
    },
    {
      id: "zeropoint",
      src: "/agents/kayo/zeropoint.png",
      name: "Zero/Point",
      action: "draggable",
    },
    {
      id: "nullcmd",
      src: "/agents/kayo/nullcmd.png",
      name: "NULL/cmd",
      action: "draggable",
    },
  ],
  Killjoy: [
    {
      id: "alarmbot",
      src: "/agents/killjoy/alarmbot.png",
      name: "Alarmbot",
      action: "draggable",
    },
    {
      id: "turret",
      src: "/agents/killjoy/turret.png",
      name: "Turret",
      action: "draggable",
    },
    {
      id: "nanoswarm",
      src: "/agents/killjoy/nanoswarm.png",
      name: "Nanoswarm",
      action: "draggable",
    },
    {
      id: "lockdown",
      src: "/agents/killjoy/lockdown.png",
      name: "Lockdown",
      action: "draggable",
    },
  ],
  Neon: [
    {
      id: "relay_bolt",
      src: "/agents/neon/relay_bolt.png",
      name: "Relay Bolt",
      action: "draggable",
    },
    {
      id: "high_gear",
      src: "/agents/neon/high_gear.png",
      name: "High Gear",
      action: "draggable",
    },
    {
      id: "fast_lane",
      src: "/agents/neon/fast_lane.png",
      name: "Fast Lane",
      action: "draggable",
    },
    {
      id: "overdrive",
      src: "/agents/neon/overdrive.png",
      name: "Overdrive",
      action: "draggable",
    },
  ],
  Omen: [
    {
      id: "paranoia",
      src: "/agents/omen/paranoia.png",
      name: "Paranoia",
      action: "draggable",
    },
    {
      id: "dark_cover",
      src: "/agents/omen/dark_cover.png",
      name: "Dark Cover",
      action: "draggable",
    },
    {
      id: "shrouded_step",
      src: "/agents/omen/shrouded_step.png",
      name: "Shrouded Step",
      action: "draggable",
    },
    {
      id: "from_the_shadows",
      src: "/agents/omen/from_the_shadows.png",
      name: "From the Shadows",
      action: "draggable",
    },
  ],
  Phoenix: [
    {
      id: "curveball",
      src: "/agents/phoenix/curveball.png",
      name: "Curveball",
      action: "draggable",
    },
    {
      id: "hot_hands",
      src: "/agents/phoenix/hot_hands.png",
      name: "Hot Hands",
      action: "draggable",
    },
    {
      id: "blaze",
      src: "/agents/phoenix/blaze.png",
      name: "Blaze",
      action: "draggable",
    },
    {
      id: "run_it_back",
      src: "/agents/phoenix/run_it_back.png",
      name: "Run it Back",
      action: "draggable",
    },
  ],
  Raze: [
    {
      id: "blast_pack",
      src: "/agents/raze/blast_pack.png",
      name: "Blast Pack",
      action: "draggable",
    },
    {
      id: "paint_shells",
      src: "/agents/raze/paint_shells.png",
      name: "Paint Shells",
      action: "draggable",
    },
    {
      id: "boom_bot",
      src: "/agents/raze/boom_bot.png",
      name: "Boom Bot",
      action: "draggable",
    },
    {
      id: "showstopper",
      src: "/agents/raze/showstopper.png",
      name: "Showstopper",
      action: "draggable",
    },
  ],
  Reyna: [
    {
      id: "devour",
      src: "/agents/reyna/devour.png",
      name: "Devour",
      action: "draggable",
    },
    {
      id: "dismiss",
      src: "/agents/reyna/dismiss.png",
      name: "Dismiss",
      action: "draggable",
    },
    {
      id: "leer",
      src: "/agents/reyna/leer.png",
      name: "Leer",
      action: "draggable",
    },
    {
      id: "empress",
      src: "/agents/reyna/empress.png",
      name: "Empress",
      action: "draggable",
    },
  ],
  Sage: [
    {
      id: "slow_orb",
      src: "/agents/sage/slow_orb.png",
      name: "Slow Orb",
      action: "draggable",
    },
    {
      id: "healing_orb",
      src: "/agents/sage/healing_orb.png",
      name: "Healing Orb",
      action: "draggable",
    },
    {
      id: "barrier_orb",
      src: "/agents/sage/barrier_orb.png",
      name: "Barrier Orb",
      action: "draggable",
    },
    {
      id: "resurrection",
      src: "/agents/sage/resurrection.png",
      name: "Resurrection",
      action: "draggable",
    },
  ],
  Skye: [
    {
      id: "trailblazer",
      src: "/agents/skye/trailblazer.png",
      name: "Trailblazer",
      action: "draggable",
    },
    {
      id: "guiding_light",
      src: "/agents/skye/guiding_light.png",
      name: "Guiding Light",
      action: "draggable",
    },
    {
      id: "regrowth",
      src: "/agents/skye/regrowth.png",
      name: "Regrowth",
      action: "draggable",
    },
    {
      id: "seekers",
      src: "/agents/skye/seekers.png",
      name: "Seekers",
      action: "draggable",
    },
  ],
  Sova: [
    {
      id: "shock_bolt",
      src: "/agents/sova/shock_bolt.png",
      name: "Shock Bolt",
      action: "draggable",
    },
    {
      id: "recon_bolt",
      src: "/agents/sova/recon_bolt.png",
      name: "Recon Bolt",
      action: "draggable",
    },
    {
      id: "owl_drone",
      src: "/agents/sova/owl_drone.png",
      name: "Owl Drone",
      action: "draggable",
    },
    {
      id: "hunters_fury",
      src: "/agents/sova/hunter's_fury.png",
      name: "Hunter's Fury",
      action: "draggable",
    },
  ],
  Tejo: [
    {
      id: "stealth_drone",
      src: "/agents/tejo/stealth_drone.png",
      name: "Stealth Drone",
      action: "draggable",
    },
    {
      id: "guided_salvo",
      src: "/agents/tejo/guided_salvo.png",
      name: "Guided Salvo",
      action: "draggable",
    },
    {
      id: "special_delivery",
      src: "/agents/tejo/special_delivery.png",
      name: "Special Delivery",
      action: "draggable",
    },
    {
      id: "armageddon",
      src: "/agents/tejo/armageddon.png",
      name: "Armageddon",
      action: "draggable",
    },
  ],
  Viper: [
    {
      id: "poison_cloud",
      src: "/agents/viper/poison_cloud.png",
      name: "Poison Cloud",
      action: "draggable",
    },
    {
      id: "toxic_screen",
      src: "/agents/viper/toxic_screen.png",
      name: "Toxic Screen",
      action: "draggable",
    },
    {
      id: "snake_bite",
      src: "/agents/viper/snake_bite.png",
      name: "Snake Bite",
      action: "draggable",
    },
    {
      id: "vipers_pit",
      src: "/agents/viper/viper's_pit.png",
      name: "Viper's Pit",
      action: "draggable",
    },
  ],
  Vyse: [
    {
      id: "arc_rose",
      src: "/agents/vyse/arc_rose.png",
      name: "Arc Rose",
      action: "draggable",
    },
    {
      id: "razorvine",
      src: "/agents/vyse/razorvine.png",
      name: "Razor Vine",
      action: "draggable",
    },
    {
      id: "shear",
      src: "/agents/vyse/shear.png",
      name: "Shear",
      action: "draggable",
    },
    {
      id: "steel_garden",
      src: "/agents/vyse/steel_garden.png",
      name: "Steel Garden",
      action: "draggable",
    },
  ],
  Waylay: [
    {
      id: "saturate",
      src: "/agents/waylay/saturate.png",
      name: "Saturate",
      action: "draggable",
    },
    {
      id: "refract",
      src: "/agents/waylay/refract.png",
      name: "Refract",
      action: "draggable",
    },
    {
      id: "lightspeed",
      src: "/agents/waylay/lightspeed.png",
      name: "Lightspeed",
      action: "draggable",
    },
    {
      id: "convergent_paths",
      src: "/agents/waylay/convergent_paths.png",
      name: "Convergent Paths",
      action: "draggable",
    },
  ],
  Yoru: [
    {
      id: "fakeout",
      src: "/agents/yoru/fakeout.png",
      name: "Fakeout",
      action: "draggable",
    },
    {
      id: "gatecrash",
      src: "/agents/yoru/gatecrash.png",
      name: "Gatecrash",
      action: "draggable",
    },
    {
      id: "blindside",
      src: "/agents/yoru/blindside.png",
      name: "Blindside",
      action: "draggable",
    },
    {
      id: "dimensional_drift",
      src: "/agents/yoru/dimensional_drift.png",
      name: "Dimensional Drift",
      action: "draggable",
    },
  ],
};

export const PIXELS_PER_METER = 30.75 / 4.15;

export const CIRCLE_ABILITY_CONFIG: Record<
  CircleAbility,
  { radius: number; colors: { stroke: string; fill: string } }
> = {
  astra_stun: {
    radius: 4.75,
    colors: { stroke: "#ffe17a", fill: "#4f007680" },
  },
  astra_suck: {
    radius: 4.75,
    colors: { stroke: "#ffe17a", fill: "#4f007680" },
  },
  astra_smoke: {
    radius: 4.75,
    colors: { stroke: "#ffe17a", fill: "#4f007680" },
  },
  brim_smoke: {
    radius: 4.15,
    colors: { stroke: "#fffe1a", fill: "#eb953f80" },
  },
  brim_stim: {
    radius: 6,
    colors: { stroke: "#7bddc3", fill: "#eb953f80" },
  },
  brim_molly: {
    radius: 4.5,
    colors: { stroke: "#e0392d", fill: "#57205780" },
  },
  brim_ult: {
    radius: 9,
    colors: { stroke: "#e0392d", fill: "#eb953f80" },
  },
  chamber_trip: {
    radius: 10,
    colors: { stroke: "#d37c48", fill: "#d37c4880" },
  },
  chamber_tp: {
    radius: 18,
    colors: { stroke: "#fcbf07", fill: "#fcbf0780" },
  },
  clove_meddle: {
    radius: 6,
    colors: { stroke: "#f674ff", fill: "#fbd7ff80" },
  },
  clove_smoke: {
    radius: 4,
    colors: { stroke: "#c9d3eb", fill: "#f674ff80" },
  },
  cypher_cage: {
    radius: 3.72,
    colors: { stroke: "#def4ff", fill: "#9a9da580" },
  },
  harbor_cove: {
    radius: 4.5,
    colors: { stroke: "#f2d6a3", fill: "#136c6b80" },
  },
};
