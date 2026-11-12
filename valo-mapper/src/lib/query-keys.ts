export const queryKeys = {
  user: ["user"] as const,
  folders: ["folders-and-strategies"] as const,
  billingPlans: ["billing-plans"] as const,
  stackMembers: ["stack-members"] as const,
  stackPendingInvites: ["stack-pending-invites"] as const,
  lobby: (lobbyCode: string) => ["lobby", lobbyCode] as const,
  matches: (limit: number) => ["matches", limit] as const,
  matchSummary: (
    matchId: string | null,
    includeReplayTelemetry: boolean,
    viewerUid: string | null,
  ) =>
    ["match-summary", matchId, includeReplayTelemetry, viewerUid] as const,
};
