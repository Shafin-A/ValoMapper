const sanitizeAgentName = (name: string): string => {
  return name.replace(/\//g, "").replace(/\s+/g, "_").toLowerCase();
};

export const getAgentImgSrc = (agentName: string): string => {
  const sanitizedName = sanitizeAgentName(agentName);
  return `/agents/${sanitizedName}/${sanitizedName}.png`;
};
