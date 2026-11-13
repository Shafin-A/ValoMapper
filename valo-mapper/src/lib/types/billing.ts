export type StackMember = {
  id: number;
  ownerUserId: number;
  memberUserId: number;
  status: "pending" | "active";
  invitedAt: Date | string;
  joinedAt?: Date | string | null;
  memberEmail?: string | null;
  memberName?: string | null;
  ownerEmail?: string | null;
  ownerName?: string | null;
};

export type StackOwner = {
  userId: number;
  email?: string | null;
  name?: string | null;
};

export type StackMembersResponse = {
  owner: StackOwner;
  members: StackMember[];
  canManage: boolean;
};
