import { Agent } from "./types";

export const AGENTS: Agent[] = [
  { name: "Astra", src: "/agents/astra.png", role: "Controller" },
  { name: "Breach", src: "/agents/breach.png", role: "Initiator" },
  { name: "Brimstone", src: "/agents/brimstone.png", role: "Controller" },
  { name: "Chamber", src: "/agents/chamber.png", role: "Sentinel" },
  { name: "Clove", src: "/agents/clove.png", role: "Controller" },
  { name: "Cypher", src: "/agents/cypher.png", role: "Sentinel" },
  { name: "Deadlock", src: "/agents/deadlock.png", role: "Sentinel" },
  { name: "Fade", src: "/agents/fade.png", role: "Initiator" },
  { name: "Gekko", src: "/agents/gekko.png", role: "Initiator" },
  { name: "Harbor", src: "/agents/harbor.png", role: "Controller" },
  { name: "Iso", src: "/agents/iso.png", role: "Duelist" },
  { name: "Jett", src: "/agents/jett.png", role: "Duelist" },
  { name: "KAY/O", src: "/agents/kayo.png", role: "Initiator" },
  { name: "Killjoy", src: "/agents/killjoy.png", role: "Sentinel" },
  { name: "Neon", src: "/agents/neon.png", role: "Duelist" },
  { name: "Omen", src: "/agents/omen.png", role: "Controller" },
  { name: "Phoenix", src: "/agents/phoenix.png", role: "Duelist" },
  { name: "Raze", src: "/agents/raze.png", role: "Duelist" },
  { name: "Reyna", src: "/agents/reyna.png", role: "Duelist" },
  { name: "Sage", src: "/agents/sage.png", role: "Sentinel" },
  { name: "Skye", src: "/agents/skye.png", role: "Initiator" },
  { name: "Sova", src: "/agents/sova.png", role: "Initiator" },
  { name: "Tejo", src: "/agents/tejo.png", role: "Initiator" },
  { name: "Viper", src: "/agents/viper.png", role: "Controller" },
  { name: "Vyse", src: "/agents/vyse.png", role: "Sentinel" },
  { name: "Waylay", src: "/agents/waylay.png", role: "Duelist" },
  { name: "Yoru", src: "/agents/yoru.png", role: "Duelist" },
];

export const ROLE_ICONS: Record<string, string> = {
  Controller: "/roles/controller.png",
  Duelist: "/roles/duelist.png",
  Initiator: "/roles/initiator.png",
  Sentinel: "/roles/sentinel.png",
};
