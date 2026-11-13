export type StrategyData = {
  id: string;
  name: string;
  type: "folder" | "strategy";
  lobbyCode?: string;
  selectedMapId?: string;
  updatedAt?: Date;
  children?: StrategyData[];
};

export type Folder = {
  id: number;
  userId: number;
  name: string;
  parentFolderId?: number;
  createdAt: Date;
  updatedAt: Date;
};

export type Strategy = {
  id: number;
  userId: number;
  folderId?: number;
  name: string;
  selectedMapId: string;
  lobbyCode: string;
  updatedAt: Date;
};

export type User = {
  id: number;
  firebaseUid: string;
  rsoSubjectId?: string | null;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  tourCompleted?: boolean;
  isSubscribed?: boolean;
  personalIsSubscribed?: boolean;
  subscriptionStartedAt?: Date | string | null;
  subscriptionEndedAt?: Date | string | null;
  subscriptionTrialEndsAt?: Date | string | null;
  subscriptionPlan?: "monthly" | "yearly" | "stack" | null;
  personalSubscriptionEndedAt?: Date | string | null;
  personalSubscriptionTrialEndsAt?: Date | string | null;
  personalSubscriptionPlan?: "monthly" | "yearly" | "stack" | null;
  premiumTrialEligible?: boolean;
  premiumTrialDaysLeft?: number;
};
