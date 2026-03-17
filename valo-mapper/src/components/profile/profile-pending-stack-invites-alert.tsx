import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StackMember } from "@/lib/types";
import { AlertCircle, Loader2 } from "lucide-react";

interface ProfilePendingStackInvitesAlertProps {
  pendingStackInvites?: StackMember[];
  isPendingStackInviteLoading: boolean;
  hasPendingStackInvites: boolean;
  isPendingInviteAction: boolean;
  isAcceptingStackInvite: boolean;
  isDecliningStackInvite: boolean;
  onAcceptPendingInvite: (inviteId: number) => void;
  onDeclinePendingInvite: (inviteId: number) => void;
}

export const ProfilePendingStackInvitesAlert = ({
  pendingStackInvites,
  isPendingStackInviteLoading,
  hasPendingStackInvites,
  isPendingInviteAction,
  isAcceptingStackInvite,
  isDecliningStackInvite,
  onAcceptPendingInvite,
  onDeclinePendingInvite,
}: ProfilePendingStackInvitesAlertProps) => {
  if (!isPendingStackInviteLoading && !hasPendingStackInvites) {
    return null;
  }

  return (
    <Alert className="border-amber-200 bg-stone-50 text-stone-900 shadow-sm dark:border-amber-900/70 dark:bg-zinc-900 dark:text-zinc-100">
      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertTitle>
        Pending Stack Invite{(pendingStackInvites?.length ?? 0) > 1 ? "s" : ""}
      </AlertTitle>
      <AlertDescription className="space-y-2 text-stone-700 dark:text-zinc-300">
        {isPendingStackInviteLoading ? (
          <p className="text-xs">Checking for pending invites...</p>
        ) : (
          <>
            <p className="text-xs">
              You can accept any invite below to join that owner&apos;s Premium
              Stack.
            </p>
            <p className="text-xs">
              Accepting will activate stack membership and any personal paid
              subscription will be scheduled to cancel at period end.
            </p>
            <div className="space-y-2 pt-1">
              {(pendingStackInvites ?? []).map((invite) => {
                const sentAt = invite.invitedAt
                  ? new Date(invite.invitedAt)
                  : null;
                const ownerDisplay =
                  invite.ownerName?.trim() ||
                  invite.ownerEmail?.trim() ||
                  `User #${invite.ownerUserId}`;

                return (
                  <div
                    key={invite.id}
                    className="rounded-md border border-amber-200/80 bg-background/70 p-2 dark:border-amber-900/70"
                  >
                    <p className="text-xs font-medium text-stone-900 dark:text-zinc-100">
                      {ownerDisplay}
                    </p>
                    {sentAt && !Number.isNaN(sentAt.getTime()) && (
                      <p className="text-[11px] text-stone-600 dark:text-zinc-400">
                        Invited{" "}
                        {sentAt.toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onAcceptPendingInvite(invite.id)}
                        disabled={isPendingInviteAction}
                      >
                        {isAcceptingStackInvite && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Accept Invite
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => onDeclinePendingInvite(invite.id)}
                        disabled={isPendingInviteAction}
                      >
                        {isDecliningStackInvite && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Decline
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </AlertDescription>
    </Alert>
  );
};
