"use client";

import { useUser } from "@/hooks/api/use-user";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUpdateUser } from "@/hooks/api/use-update-user";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Home } from "lucide-react";
import Link from "next/link";
import { useDeleteUser } from "@/hooks/api/use-delete-user";
import { useCancelSubscription } from "@/hooks/api/use-cancel-subscription";
import { useResumeSubscription } from "@/hooks/api/use-resume-subscription";
import { useStackMembers } from "@/hooks/api/use-stack-members";
import { useInviteStackMember } from "@/hooks/api/use-invite-stack-member";
import { useRemoveStackMember } from "@/hooks/api/use-remove-stack-member";
import { usePendingStackInvites } from "@/hooks/api/use-pending-stack-invite";
import { useAcceptStackInvite } from "@/hooks/api/use-accept-stack-invite";
import { useDeclineStackInvite } from "@/hooks/api/use-decline-stack-invite";
import { useLeaveStack } from "@/hooks/api/use-leave-stack";
import { ProfileAccountFields } from "./profile-account-fields";
import {
  ProfileLoadingCard,
  ProfileNotAuthenticatedCard,
  ProfileUserDataNotFoundCard,
} from "./profile-state-cards";
import { ProfilePendingStackInvitesAlert } from "./profile-pending-stack-invites-alert";
import { ProfileSubscriptionSection } from "./profile-subscription-section";
import { ProfileStackMembersSection } from "./profile-stack-members-section";
import { ProfileActionsRow } from "./profile-actions-row";
import { ProfileDeleteAccountSection } from "./profile-delete-account-section";

export const ProfileContent = () => {
  const { data: user, isLoading, refetch } = useUser();
  const { logout, user: firebaseUser } = useFirebaseAuth();
  const { mutate: updateUser, isPending: isUpdatingUser } = useUpdateUser();
  const { mutate: deleteUser, isPending: isDeletingUser } = useDeleteUser();
  const { mutate: cancelSubscription, isPending: isCancelPending } =
    useCancelSubscription();
  const { mutate: resumeSubscription, isPending: isResumePending } =
    useResumeSubscription();
  const { mutate: inviteStackMember, isPending: isInvitingStackMember } =
    useInviteStackMember();
  const { mutate: removeStackMember, isPending: isRemovingStackMember } =
    useRemoveStackMember();
  const { mutate: acceptStackInvite, isPending: isAcceptingStackInvite } =
    useAcceptStackInvite();
  const { mutate: declineStackInvite, isPending: isDecliningStackInvite } =
    useDeclineStackInvite();
  const { mutate: leaveStack, isPending: isLeavingStack } = useLeaveStack();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isStackPlan = !isLoading && user?.subscriptionPlan === "stack";
  const canCheckPendingInvite = !isLoading && Boolean(user) && !isStackPlan;
  const {
    data: pendingStackInvites,
    isLoading: isPendingStackInviteLoading,
    refetch: refetchPendingStackInvites,
  } = usePendingStackInvites(canCheckPendingInvite);
  const {
    data: stackMembersData,
    isLoading: isStackMembersLoading,
    error: stackMembersError,
    refetch: refetchStackMembers,
  } = useStackMembers(isStackPlan);

  const [name, setName] = useState("");
  const [inviteFirebaseUid, setInviteFirebaseUid] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
    }
  }, [user]);

  if (isLoading || isLoggingOut || isDeletingUser) {
    return <ProfileLoadingCard />;
  }

  if (!firebaseUser) {
    return <ProfileNotAuthenticatedCard />;
  }

  if (!user) {
    return <ProfileUserDataNotFoundCard />;
  }

  const isRSOUser = Boolean(
    (user as { rsoSubjectId?: string | null }).rsoSubjectId,
  );
  const isMonthlyPlan = user.subscriptionPlan === "monthly";
  const isYearlyPlan = user.subscriptionPlan === "yearly";
  const hasValoMapperPremium = Boolean(user.isSubscribed);
  const premiumTrialDaysLeft =
    typeof user.premiumTrialDaysLeft === "number" &&
    user.premiumTrialDaysLeft > 0
      ? user.premiumTrialDaysLeft
      : null;
  const hasActivePremiumTrial =
    hasValoMapperPremium && isMonthlyPlan && premiumTrialDaysLeft !== null;
  const subscriptionEndsAt = user.subscriptionEndedAt
    ? new Date(user.subscriptionEndedAt)
    : null;
  const hasScheduledCancellation =
    hasValoMapperPremium &&
    subscriptionEndsAt !== null &&
    !Number.isNaN(subscriptionEndsAt.getTime());
  const currentUserName = user.name?.trim() || "";
  const searchQuery = searchParams.toString();
  const returnToPath = searchQuery ? `${pathname}?${searchQuery}` : pathname;
  const canManageStackFromApi = stackMembersData?.canManage === true;
  const stackMembers = stackMembersData?.members ?? [];
  const hasSelfActiveStackMembership = stackMembers.some(
    (member) => member.memberUserId === user.id && member.status === "active",
  );
  const canManageStack = canManageStackFromApi && !hasSelfActiveStackMembership;
  const stackRoleLabel = canManageStack ? "Stack Owner" : "Stack Member";
  const stackOwner = stackMembersData?.owner;
  const stackOwnerDisplayName =
    stackOwner?.name?.trim() ||
    stackOwner?.email?.trim() ||
    (typeof stackOwner?.userId === "number"
      ? `User #${stackOwner.userId}`
      : "Owner");
  const stackOwnerDisplayEmail = stackOwner?.email?.trim() || "No email";
  const stackSeatCount = (stackOwner ? 1 : 0) + stackMembers.length;
  const isActiveStackMember = isStackPlan && !canManageStack;
  const hasPendingStackInvites = (pendingStackInvites?.length ?? 0) > 0;
  const isPendingInviteAction =
    isAcceptingStackInvite || isDecliningStackInvite;

  const subscriptionLabel = (() => {
    if (!hasValoMapperPremium) {
      return "Free";
    }

    if (hasActivePremiumTrial) {
      return `Trial (${premiumTrialDaysLeft} day${premiumTrialDaysLeft === 1 ? "" : "s"} left)`;
    }

    if (isStackPlan) {
      return isStackMembersLoading ? "Stack (Loading...)" : stackRoleLabel;
    }

    if (isYearlyPlan) {
      return "Yearly";
    }

    if (isMonthlyPlan) {
      return "Monthly";
    }

    return "Premium";
  })();

  const subscriptionSummary = (() => {
    if (!hasValoMapperPremium) {
      return "You are currently on the free plan.";
    }

    if (hasScheduledCancellation && subscriptionEndsAt) {
      return `${subscriptionLabel} access remains active until ${subscriptionEndsAt.toLocaleDateString(
        "en-US",
        {
          year: "numeric",
          month: "short",
          day: "numeric",
        },
      )}.`;
    }

    if (hasActivePremiumTrial) {
      return `You are currently on a Premium trial with ${premiumTrialDaysLeft} day${premiumTrialDaysLeft === 1 ? "" : "s"} remaining.`;
    }

    if (isStackPlan) {
      return canManageStack
        ? "You are the stack owner for this Premium Stack plan."
        : `You are covered under ${stackOwnerDisplayName}'s Premium Stack plan.`;
    }

    if (isYearlyPlan) {
      return "Your Yearly Premium subscription is active.";
    }

    if (isMonthlyPlan) {
      return "Your Monthly Premium subscription is active.";
    }

    return "Your ValoMapper Premium subscription is active.";
  })();

  const subscriptionBadgeText = hasScheduledCancellation
    ? `${subscriptionLabel} (Cancels at Period End)`
    : subscriptionLabel;

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  const handleCopyFirebaseUid = async () => {
    if (!user.firebaseUid) {
      toast.error("UID is unavailable");
      return;
    }

    try {
      await navigator.clipboard.writeText(user.firebaseUid);
      toast.success("UID copied");
    } catch {
      toast.error("Failed to copy UID");
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast.error("User data not available");
      return;
    }

    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    updateUser(
      {
        name: name.trim(),
      },
      {
        onSuccess: () => {
          refetch();
          setIsEditing(false);
        },
      },
    );
  };

  const handleCancel = () => {
    setName(user.name || "");
    setIsEditing(false);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    router.push("/");
  };

  const handleDeleteAccount = async () => {
    deleteUser(undefined, {
      onSuccess: async () => {
        await logout();
        router.push("/");
      },
    });
  };

  const handleCancelSubscription = () => {
    cancelSubscription(undefined, {
      onSuccess: () => {
        refetch();
      },
    });
  };

  const handleResumeSubscription = () => {
    resumeSubscription(undefined, {
      onSuccess: () => {
        refetch();
      },
    });
  };

  const handleInviteStackMember = () => {
    const trimmedUid = inviteFirebaseUid.trim();
    if (!trimmedUid) {
      toast.error("Enter a UID to invite");
      return;
    }

    inviteStackMember(trimmedUid, {
      onSuccess: () => {
        setInviteFirebaseUid("");
        refetchStackMembers();
      },
    });
  };

  const handleRemoveStackMember = (stackMemberId: number) => {
    removeStackMember(stackMemberId, {
      onSuccess: () => {
        refetchStackMembers();
      },
    });
  };

  const handleAcceptPendingInvite = (inviteId: number) => {
    acceptStackInvite(inviteId, {
      onSuccess: () => {
        refetch();
        refetchPendingStackInvites();
        refetchStackMembers();
      },
    });
  };

  const handleDeclinePendingInvite = (inviteId: number) => {
    declineStackInvite(inviteId, {
      onSuccess: () => {
        refetch();
        refetchPendingStackInvites();
      },
    });
  };

  const handleLeaveActiveStack = () => {
    leaveStack(undefined, {
      onSuccess: () => {
        refetch();
        refetchStackMembers();
      },
    });
  };

  return (
    <div className="w-full">
      <Card>
        <CardHeader>
          <CardTitle className="flex gap-2 items-center">
            <Button variant="outline" size="icon" asChild>
              <Link href="/">
                <Home className="h-4 w-4" />
              </Link>
            </Button>
            My Profile
          </CardTitle>
          <CardDescription>
            View and manage your account information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <ProfileAccountFields
              user={user}
              name={name}
              isRSOUser={isRSOUser}
              isEditing={isEditing}
              isUpdatingUser={isUpdatingUser}
              onNameChange={handleNameChange}
              onCopyFirebaseUid={handleCopyFirebaseUid}
            />

            {!isStackPlan && (
              <ProfilePendingStackInvitesAlert
                pendingStackInvites={pendingStackInvites}
                isPendingStackInviteLoading={isPendingStackInviteLoading}
                hasPendingStackInvites={hasPendingStackInvites}
                isPendingInviteAction={isPendingInviteAction}
                isAcceptingStackInvite={isAcceptingStackInvite}
                isDecliningStackInvite={isDecliningStackInvite}
                onAcceptPendingInvite={handleAcceptPendingInvite}
                onDeclinePendingInvite={handleDeclinePendingInvite}
              />
            )}

            <ProfileSubscriptionSection
              hasValoMapperPremium={hasValoMapperPremium}
              hasScheduledCancellation={hasScheduledCancellation}
              hasActivePremiumTrial={hasActivePremiumTrial}
              subscriptionBadgeText={subscriptionBadgeText}
              subscriptionSummary={subscriptionSummary}
              isStackPlan={isStackPlan}
              isStackMembersLoading={isStackMembersLoading}
              isActiveStackMember={isActiveStackMember}
              isLeavingStack={isLeavingStack}
              isResumePending={isResumePending}
              isCancelPending={isCancelPending}
              returnToPath={returnToPath}
              onLeaveActiveStack={handleLeaveActiveStack}
              onResumeSubscription={handleResumeSubscription}
              onCancelSubscription={handleCancelSubscription}
            />

            <ProfileStackMembersSection
              isStackPlan={isStackPlan}
              stackSeatCount={stackSeatCount}
              canManageStack={canManageStack}
              inviteFirebaseUid={inviteFirebaseUid}
              isInvitingStackMember={isInvitingStackMember}
              isStackMembersLoading={isStackMembersLoading}
              stackMembersErrorMessage={stackMembersError?.message}
              stackOwner={stackOwner}
              stackOwnerDisplayName={stackOwnerDisplayName}
              stackOwnerDisplayEmail={stackOwnerDisplayEmail}
              stackMembers={stackMembers}
              currentUserId={user.id}
              isRemovingStackMember={isRemovingStackMember}
              onInviteFirebaseUidChange={setInviteFirebaseUid}
              onInviteStackMember={handleInviteStackMember}
              onRemoveStackMember={handleRemoveStackMember}
            />

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <div className="text-xs font-semibold">Member Since</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              </div>

              <div className="space-y-2 text-right">
                <div className="text-xs font-semibold">Last Updated</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(user.updatedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              </div>
            </div>

            <ProfileActionsRow
              isEditing={isEditing}
              isRSOUser={isRSOUser}
              isUpdatingUser={isUpdatingUser}
              currentName={name}
              currentUserName={currentUserName}
              onStartEdit={() => setIsEditing(true)}
              onSave={handleSave}
              onCancel={handleCancel}
              onLogout={handleLogout}
            />

            <ProfileDeleteAccountSection
              isEditing={isEditing}
              onDeleteAccount={handleDeleteAccount}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
