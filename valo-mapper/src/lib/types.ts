export type Agent = {
  name: string;
  src: string;
  role: "Duelist" | "Controller" | "Initiator" | "Sentinel";
};

export type AgentCanvas = {
  name: string;
  src: string;
  role: "Duelist" | "Controller" | "Initiator" | "Sentinel";
  isAlly: boolean;
  x: number;
  y: number;
};
