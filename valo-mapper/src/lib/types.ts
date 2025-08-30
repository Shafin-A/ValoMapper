export type Agent = {
  name: string;
  src: string;
  role: AgentRole;
};

export type AgentCanvas = {
  name: string;
  src: string;
  role: AgentRole;
  isAlly: boolean;
  x: number;
  y: number;
};

export type AgentRole = "Duelist" | "Controller" | "Initiator" | "Sentinel";

export type AgentsSettings = {
  scale: number;
  boxOpacity: number;
  radius: number;
  allyColor: string;
  enemyColor: string;
};

export type AgentIconConfig = {
  id: string;
  icon: string;
  label: string;
  action: string;
}[];
