import { Agent, AgentIconConfig } from "./types";

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

export const AGENT_ICON_CONFIGS: Record<string, AgentIconConfig> = {
  Astra: [
    {
      id: "nova_pulse",
      icon: "/agents/astra/nova_pulse.png",
      label: "Nova Pulse",
      action: "draggable",
    },
    {
      id: "gravity_well",
      icon: "/agents/astra/gravity_well.png",
      label: "Gravity Well",
      action: "draggable",
    },
    {
      id: "nebula__dissipate",
      icon: "/agents/astra/nebula___dissipate.png",
      label: "Nebula / Dissipate",
      action: "draggable",
    },
    {
      id: "cosmic_divide",
      icon: "/agents/astra/cosmic_divide.png",
      label: "Cosmic Divide",
      action: "draggable",
    },
    {
      id: "astra_passive",
      icon: "/agents/astra/astral_form.png",
      label: "Astral Star",
      action: "draggable",
    },
  ],
  Breach: [
    {
      id: "aftershock",
      icon: "/agents/breach/aftershock.png",
      label: "Aftershock",
      action: "draggable",
    },
    {
      id: "fault_line",
      icon: "/agents/breach/fault_line.png",
      label: "Fault Line",
      action: "draggable",
    },
    {
      id: "flashpoint",
      icon: "/agents/breach/flashpoint.png",
      label: "Flashpoint",
      action: "draggable",
    },
    {
      id: "rolling_thunder",
      icon: "/agents/breach/rolling_thunder.png",
      label: "Rolling Thunder",
      action: "draggable",
    },
  ],
  Brimstone: [
    {
      id: "incendiary",
      icon: "/agents/brimstone/incendiary.png",
      label: "Incendiary",
      action: "draggable",
    },
    {
      id: "sky_smoke",
      icon: "/agents/brimstone/sky_smoke.png",
      label: "Sky Smoke",
      action: "draggable",
    },
    {
      id: "stim_beacon",
      icon: "/agents/brimstone/stim_beacon.png",
      label: "Stim Beacon",
      action: "draggable",
    },
    {
      id: "orbital_strike",
      icon: "/agents/brimstone/orbital_strike.png",
      label: "Orbital Strike",
      action: "draggable",
    },
  ],
  Chamber: [
    {
      id: "headhunter",
      icon: "/agents/chamber/headhunter.png",
      label: "Headhunter",
      action: "draggable",
    },
    {
      id: "rendezvous",
      icon: "/agents/chamber/rendezvous.png",
      label: "Rendezvous",
      action: "draggable",
    },
    {
      id: "trademark",
      icon: "/agents/chamber/trademark.png",
      label: "Trademark",
      action: "draggable",
    },
    {
      id: "tour_de_force",
      icon: "/agents/chamber/tour_de_force.png",
      label: "Tour de Force",
      action: "draggable",
    },
  ],
  Clove: [
    {
      id: "meddle",
      icon: "/agents/clove/meddle.png",
      label: "Meddle",
      action: "draggable",
    },
    {
      id: "not_dead_yet",
      icon: "/agents/clove/not_dead_yet.png",
      label: "Not Dead Yet",
      action: "draggable",
    },
    {
      id: "pick_me_up",
      icon: "/agents/clove/pick_me_up.png",
      label: "Pick Me Up",
      action: "draggable",
    },
    {
      id: "ruse",
      icon: "/agents/clove/ruse.png",
      label: "Ruse",
      action: "draggable",
    },
  ],
  Cypher: [
    {
      id: "cyber_cage",
      icon: "/agents/cypher/cyber_cage.png",
      label: "Cyber Cage",
      action: "draggable",
    },
    {
      id: "spycam",
      icon: "/agents/cypher/spycam.png",
      label: "Spycam",
      action: "draggable",
    },
    {
      id: "trapwire",
      icon: "/agents/cypher/trapwire.png",
      label: "Trapwire",
      action: "draggable",
    },
    {
      id: "neural_theft",
      icon: "/agents/cypher/neural_theft.png",
      label: "Neural Theft",
      action: "draggable",
    },
  ],
  Deadlock: [
    {
      id: "barrier_mesh",
      icon: "/agents/deadlock/barrier_mesh.png",
      label: "Barrier Mesh",
      action: "draggable",
    },
    {
      id: "gravnet",
      icon: "/agents/deadlock/gravnet.png",
      label: "GravNet",
      action: "draggable",
    },
    {
      id: "sonic_sensor",
      icon: "/agents/deadlock/sonic_sensor.png",
      label: "Sonic Sensor",
      action: "draggable",
    },
    {
      id: "annihilation",
      icon: "/agents/deadlock/annihilation.png",
      label: "Annihilation",
      action: "draggable",
    },
  ],
  Fade: [
    {
      id: "prowler",
      icon: "/agents/fade/prowler.png",
      label: "Prowler",
      action: "draggable",
    },
    {
      id: "seize",
      icon: "/agents/fade/seize.png",
      label: "Seize",
      action: "draggable",
    },
    {
      id: "haunt",
      icon: "/agents/fade/haunt.png",
      label: "Haunt",
      action: "draggable",
    },
    {
      id: "nightfall",
      icon: "/agents/fade/nightfall.png",
      label: "Nightfall",
      action: "draggable",
    },
  ],
  Gekko: [
    {
      id: "wingman",
      icon: "/agents/gekko/wingman.png",
      label: "Wingman",
      action: "draggable",
    },
    {
      id: "dizzy",
      icon: "/agents/gekko/dizzy.png",
      label: "Dizzy",
      action: "draggable",
    },
    {
      id: "mosh_pit",
      icon: "/agents/gekko/mosh_pit.png",
      label: "Mosh Pit",
      action: "draggable",
    },
    {
      id: "thrash",
      icon: "/agents/gekko/thrash.png",
      label: "Thrash",
      action: "draggable",
    },
  ],
  Harbor: [
    {
      id: "cascade",
      icon: "/agents/harbor/cascade.png",
      label: "Cascade",
      action: "draggable",
    },
    {
      id: "cove",
      icon: "/agents/harbor/cove.png",
      label: "Cove",
      action: "harbor_cove",
    },
    {
      id: "high_tide",
      icon: "/agents/harbor/high_tide.png",
      label: "High Tide",
      action: "draggable",
    },
    {
      id: "reckoning",
      icon: "/agents/harbor/reckoning.png",
      label: "Reckoning",
      action: "draggable",
    },
  ],
  Iso: [
    {
      id: "undercut",
      icon: "/agents/iso/undercut.png",
      label: "Undercut",
      action: "draggable",
    },
    {
      id: "double_tap",
      icon: "/agents/iso/double_tap.png",
      label: "Double Tap",
      action: "draggable",
    },
    {
      id: "contingency",
      icon: "/agents/iso/contingency.png",
      label: "Contingency",
      action: "draggable",
    },
    {
      id: "kill_contract",
      icon: "/agents/iso/kill_contract.png",
      label: "Kill Contract",
      action: "draggable",
    },
  ],
  Jett: [
    {
      id: "updraft",
      icon: "/agents/jett/updraft.png",
      label: "Updraft",
      action: "draggable",
    },
    {
      id: "tailwind",
      icon: "/agents/jett/tailwind.png",
      label: "Tailwind",
      action: "draggable",
    },
    {
      id: "cloudburst",
      icon: "/agents/jett/cloudburst.png",
      label: "Cloudburst",
      action: "draggable",
    },
    {
      id: "blade_storm",
      icon: "/agents/jett/blade_storm.png",
      label: "Blade Storm",
      action: "draggable",
    },
  ],
  "KAY/O": [
    {
      id: "fragment",
      icon: "/agents/kayo/fragment.png",
      label: "Fragment",
      action: "draggable",
    },
    {
      id: "flashdrive",
      icon: "/agents/kayo/flashdrive.png",
      label: "Flash/Drive",
      action: "draggable",
    },
    {
      id: "zeropoint",
      icon: "/agents/kayo/zeropoint.png",
      label: "Zero/Point",
      action: "draggable",
    },
    {
      id: "nullcmd",
      icon: "/agents/kayo/nullcmd.png",
      label: "NULL/cmd",
      action: "draggable",
    },
  ],
  Killjoy: [
    {
      id: "alarmbot",
      icon: "/agents/killjoy/alarmbot.png",
      label: "Alarmbot",
      action: "draggable",
    },
    {
      id: "turret",
      icon: "/agents/killjoy/turret.png",
      label: "Turret",
      action: "draggable",
    },
    {
      id: "nanoswarm",
      icon: "/agents/killjoy/nanoswarm.png",
      label: "Nanoswarm",
      action: "draggable",
    },
    {
      id: "lockdown",
      icon: "/agents/killjoy/lockdown.png",
      label: "Lockdown",
      action: "draggable",
    },
  ],
  Neon: [
    {
      id: "relay_bolt",
      icon: "/agents/neon/relay_bolt.png",
      label: "Relay Bolt",
      action: "draggable",
    },
    {
      id: "high_gear",
      icon: "/agents/neon/high_gear.png",
      label: "High Gear",
      action: "draggable",
    },
    {
      id: "fast_lane",
      icon: "/agents/neon/fast_lane.png",
      label: "Fast Lane",
      action: "draggable",
    },
    {
      id: "overdrive",
      icon: "/agents/neon/overdrive.png",
      label: "Overdrive",
      action: "draggable",
    },
  ],
  Omen: [
    {
      id: "paranoia",
      icon: "/agents/omen/paranoia.png",
      label: "Paranoia",
      action: "draggable",
    },
    {
      id: "dark_cover",
      icon: "/agents/omen/dark_cover.png",
      label: "Dark Cover",
      action: "draggable",
    },
    {
      id: "shrouded_step",
      icon: "/agents/omen/shrouded_step.png",
      label: "Shrouded Step",
      action: "draggable",
    },
    {
      id: "from_the_shadows",
      icon: "/agents/omen/from_the_shadows.png",
      label: "From the Shadows",
      action: "draggable",
    },
  ],
  Phoenix: [
    {
      id: "curveball",
      icon: "/agents/phoenix/curveball.png",
      label: "Curveball",
      action: "draggable",
    },
    {
      id: "hot_hands",
      icon: "/agents/phoenix/hot_hands.png",
      label: "Hot Hands",
      action: "draggable",
    },
    {
      id: "blaze",
      icon: "/agents/phoenix/blaze.png",
      label: "Blaze",
      action: "draggable",
    },
    {
      id: "run_it_back",
      icon: "/agents/phoenix/run_it_back.png",
      label: "Run it Back",
      action: "draggable",
    },
  ],
  Raze: [
    {
      id: "blast_pack",
      icon: "/agents/raze/blast_pack.png",
      label: "Blast Pack",
      action: "draggable",
    },
    {
      id: "paint_shells",
      icon: "/agents/raze/paint_shells.png",
      label: "Paint Shells",
      action: "draggable",
    },
    {
      id: "boom_bot",
      icon: "/agents/raze/boom_bot.png",
      label: "Boom Bot",
      action: "draggable",
    },
    {
      id: "showstopper",
      icon: "/agents/raze/showstopper.png",
      label: "Showstopper",
      action: "draggable",
    },
  ],
  Reyna: [
    {
      id: "devour",
      icon: "/agents/reyna/devour.png",
      label: "Devour",
      action: "draggable",
    },
    {
      id: "dismiss",
      icon: "/agents/reyna/dismiss.png",
      label: "Dismiss",
      action: "draggable",
    },
    {
      id: "leer",
      icon: "/agents/reyna/leer.png",
      label: "Leer",
      action: "draggable",
    },
    {
      id: "empress",
      icon: "/agents/reyna/empress.png",
      label: "Empress",
      action: "draggable",
    },
  ],
  Sage: [
    {
      id: "slow_orb",
      icon: "/agents/sage/slow_orb.png",
      label: "Slow Orb",
      action: "draggable",
    },
    {
      id: "healing_orb",
      icon: "/agents/sage/healing_orb.png",
      label: "Healing Orb",
      action: "draggable",
    },
    {
      id: "barrier_orb",
      icon: "/agents/sage/barrier_orb.png",
      label: "Barrier Orb",
      action: "draggable",
    },
    {
      id: "resurrection",
      icon: "/agents/sage/resurrection.png",
      label: "Resurrection",
      action: "draggable",
    },
  ],
  Skye: [
    {
      id: "trailblazer",
      icon: "/agents/skye/trailblazer.png",
      label: "Trailblazer",
      action: "draggable",
    },
    {
      id: "guiding_light",
      icon: "/agents/skye/guiding_light.png",
      label: "Guiding Light",
      action: "draggable",
    },
    {
      id: "regrowth",
      icon: "/agents/skye/regrowth.png",
      label: "Regrowth",
      action: "draggable",
    },
    {
      id: "seekers",
      icon: "/agents/skye/seekers.png",
      label: "Seekers",
      action: "draggable",
    },
  ],
  Sova: [
    {
      id: "shock_bolt",
      icon: "/agents/sova/shock_bolt.png",
      label: "Shock Bolt",
      action: "draggable",
    },
    {
      id: "recon_bolt",
      icon: "/agents/sova/recon_bolt.png",
      label: "Recon Bolt",
      action: "draggable",
    },
    {
      id: "owl_drone",
      icon: "/agents/sova/owl_drone.png",
      label: "Owl Drone",
      action: "draggable",
    },
    {
      id: "hunters_fury",
      icon: "/agents/sova/hunter's_fury.png",
      label: "Hunter's Fury",
      action: "draggable",
    },
  ],
  Tejo: [
    {
      id: "stealth_drone",
      icon: "/agents/tejo/stealth_drone.png",
      label: "Stealth Drone",
      action: "draggable",
    },
    {
      id: "guided_salvo",
      icon: "/agents/tejo/guided_salvo.png",
      label: "Guided Salvo",
      action: "draggable",
    },
    {
      id: "special_delivery",
      icon: "/agents/tejo/special_delivery.png",
      label: "Special Delivery",
      action: "draggable",
    },
    {
      id: "armageddon",
      icon: "/agents/tejo/armageddon.png",
      label: "Armageddon",
      action: "draggable",
    },
  ],
  Viper: [
    {
      id: "poison_cloud",
      icon: "/agents/viper/poison_cloud.png",
      label: "Poison Cloud",
      action: "draggable",
    },
    {
      id: "toxic_screen",
      icon: "/agents/viper/toxic_screen.png",
      label: "Toxic Screen",
      action: "draggable",
    },
    {
      id: "snake_bite",
      icon: "/agents/viper/snake_bite.png",
      label: "Snake Bite",
      action: "draggable",
    },
    {
      id: "vipers_pit",
      icon: "/agents/viper/viper's_pit.png",
      label: "Viper's Pit",
      action: "draggable",
    },
  ],
  Vyse: [
    {
      id: "arc_rose",
      icon: "/agents/vyse/arc_rose.png",
      label: "Arc Rose",
      action: "draggable",
    },
    {
      id: "razorvine",
      icon: "/agents/vyse/razorvine.png",
      label: "Razor Vine",
      action: "draggable",
    },
    {
      id: "shear",
      icon: "/agents/vyse/shear.png",
      label: "Shear",
      action: "draggable",
    },
    {
      id: "steel_garden",
      icon: "/agents/vyse/steel_garden.png",
      label: "Steel Garden",
      action: "draggable",
    },
  ],
  Waylay: [
    {
      id: "saturate",
      icon: "/agents/waylay/saturate.png",
      label: "Saturate",
      action: "draggable",
    },
    {
      id: "refract",
      icon: "/agents/waylay/refract.png",
      label: "Refract",
      action: "draggable",
    },
    {
      id: "lightspeed",
      icon: "/agents/waylay/lightspeed.png",
      label: "Lightspeed",
      action: "draggable",
    },
    {
      id: "convergent_paths",
      icon: "/agents/waylay/convergent_paths.png",
      label: "Convergent Paths",
      action: "draggable",
    },
  ],
  Yoru: [
    {
      id: "fakeout",
      icon: "/agents/yoru/fakeout.png",
      label: "Fakeout",
      action: "draggable",
    },
    {
      id: "gatecrash",
      icon: "/agents/yoru/gatecrash.png",
      label: "Gatecrash",
      action: "draggable",
    },
    {
      id: "blindside",
      icon: "/agents/yoru/blindside.png",
      label: "Blindside",
      action: "draggable",
    },
    {
      id: "dimensional_drift",
      icon: "/agents/yoru/dimensional_drift.png",
      label: "Dimensional Drift",
      action: "draggable",
    },
  ],
};

export const PIXELS_PER_METER = 30.75 / 4.15;
export const HARBOR_COVE_CIRCLE_RADIUS = 4.5;
export const HARBOR_COVE_COLORS = {
  border: "#f2d6a3",
  background: "#136c6b80",
} as const;
