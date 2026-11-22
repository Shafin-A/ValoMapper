import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { StackMember, StackOwner } from "@/lib/types";
import { Loader2, UserPlus, Users } from "lucide-react";
import { useTranslations } from "next-intl";

interface ProfileStackMembersSectionProps {
  isStackPlan: boolean;
  stackSeatCount: number;
  canManageStack: boolean;
  inviteFirebaseUid: string;
  isInvitingStackMember: boolean;
  isStackMembersLoading: boolean;
  stackMembersErrorMessage?: string;
  stackOwner?: StackOwner;
  stackOwnerDisplayName: string;
  stackOwnerDisplayEmail: string;
  stackMembers: StackMember[];
  currentUserId: number;
  isRemovingStackMember: boolean;
  onInviteFirebaseUidChange: (value: string) => void;
  onInviteStackMember: () => void;
  onRemoveStackMember: (stackMemberId: number) => void;
}

export const ProfileStackMembersSection = ({
  isStackPlan,
  stackSeatCount,
  canManageStack,
  inviteFirebaseUid,
  isInvitingStackMember,
  isStackMembersLoading,
  stackMembersErrorMessage,
  stackOwner,
  stackOwnerDisplayName,
  stackOwnerDisplayEmail,
  stackMembers,
  currentUserId,
  isRemovingStackMember,
  onInviteFirebaseUidChange,
  onInviteStackMember,
  onRemoveStackMember,
}: ProfileStackMembersSectionProps) => {
  const t = useTranslations("profile.stack");

  if (!isStackPlan) {
    return null;
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        <p className="text-sm font-medium">
          {t("title", { count: stackSeatCount })}
        </p>
      </div>

      {canManageStack && (
        <div className="space-y-2">
          <Label htmlFor="stack-invite-uid">{t("inviteByUid")}</Label>
          <div className="flex gap-2">
            <Input
              id="stack-invite-uid"
              dir="ltr"
              value={inviteFirebaseUid}
              onChange={(event) =>
                onInviteFirebaseUidChange(event.target.value)
              }
              placeholder={t("enterUid")}
              disabled={isInvitingStackMember}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onInviteStackMember();
                }
              }}
            />
            <Button
              type="button"
              onClick={onInviteStackMember}
              disabled={isInvitingStackMember || !inviteFirebaseUid.trim()}
            >
              {isInvitingStackMember ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              {t("invite")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t("inviteHelp")}</p>
        </div>
      )}

      {isStackMembersLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : stackMembersErrorMessage ? (
        <p className="text-xs text-destructive">
          {t("loadFailed", { error: stackMembersErrorMessage })}
        </p>
      ) : !stackOwner && stackMembers.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("none")}</p>
      ) : (
        <div className="space-y-2">
          {stackOwner && (
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {stackOwnerDisplayName} ({t("owner")})
                  {stackOwner.userId === currentUserId ? ` (${t("you")})` : ""}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {stackOwnerDisplayEmail}
                </p>
              </div>
            </div>
          )}
          {stackMembers.map((member) => {
            const displayName = member.memberName?.trim() || t("unnamed");
            const displayEmail = member.memberEmail?.trim() || "";
            const isCurrentUser = member.memberUserId === currentUserId;

            return (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {displayName}
                    {isCurrentUser ? ` (${t("you")})` : ""}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {displayEmail}
                  </p>
                  {member.status === "pending" && (
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {t("pending")}
                    </p>
                  )}
                </div>
                {canManageStack && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => onRemoveStackMember(member.id)}
                    disabled={isRemovingStackMember}
                  >
                    {isRemovingStackMember && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {t("remove")}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
