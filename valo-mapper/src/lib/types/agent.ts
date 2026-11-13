export type AgentRole = "Duelist" | "Controller" | "Initiator" | "Sentinel";

export type Agent = {
  name: string;
  role: AgentRole;
};
