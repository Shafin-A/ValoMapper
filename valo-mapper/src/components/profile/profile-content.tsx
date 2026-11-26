"use client";

import { useUser } from "@/hooks/api/use-user";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
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
import { ProfileLanguageSection } from "@/components/i18n/profile-language-section";
import { ProfileFavoriteAgentsSection } from "./profile-favorite-agents-section";
import { useFormatter, useTranslations } from "next-intl";

export const ProfileContent = () => {
  const t = useTranslations("profile");
  const ts = useTranslations("profile.subscription");
  const tToast = useTranslations("toasts");
  const format = useFormatter();
  const formatDate = (date: Date) =>
    format.dateTime(date, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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

  const isRSOUser = Boolean(user.rsoSubjectId);
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
  const stackRoleLabel = canManageStack
    ? ts("stackOwner")
    : ts("stackMember");
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

  const personalSubscriptionEndsAt = user.personalSubscriptionEndedAt
    ? new Date(user.personalSubscriptionEndedAt)
    : null;

  const hasScheduledPersonalCancellation =
    user.personalIsSubscribed === true &&
    personalSubscriptionEndsAt !== null &&
    !Number.isNaN(personalSubscriptionEndsAt.getTime()) &&
    personalSubscriptionEndsAt.getTime() > Date.now();

  const personalPlanLabel = user.personalSubscriptionPlan ?? "personal";

  const hasPendingStackInvites = (pendingStackInvites?.length ?? 0) > 0;
  const isPendingInviteAction =
    isAcceptingStackInvite || isDecliningStackInvite;

  const activeStackMembership = stackMembers.find(
    (member) =>
      member.memberUserId === user.id &&
      member.status === "active" &&
      member.joinedAt !== undefined &&
      member.joinedAt !== null,
  );

  const userSubscriptionStartedAt =
    user.subscriptionStartedAt && new Date(user.subscriptionStartedAt);

  const subscriptionStartedAt =
    userSubscriptionStartedAt ||
    (isStackPlan && isActiveStackMember && activeStackMembership?.joinedAt
      ? new Date(activeStackMembership.joinedAt)
      : null) ||
    (hasValoMapperPremium ? new Date(user.createdAt) : null);

  const subscriptionStartedText = subscriptionStartedAt
    ? isStackPlan && isActiveStackMember
      ? ts("startedStack", { date: formatDate(subscriptionStartedAt) })
      : ts("started", { date: formatDate(subscriptionStartedAt) })
    : undefined;

  const subscriptionLabel = (() => {
    if (!hasValoMapperPremium) return ts("free");

    if (hasActivePremiumTrial) {
      return premiumTrialDaysLeft === 1
        ? ts("trialOne")
        : ts("trialMany", { count: premiumTrialDaysLeft });
    }

    if (isStackPlan) {
      return isStackMembersLoading ? ts("stackLoading") : stackRoleLabel;
    }

    if (isYearlyPlan) return ts("yearly");
    if (isMonthlyPlan) return ts("monthly");
    return ts("premium");
  })();

  const subscriptionSummary = (() => {
    if (!hasValoMapperPremium) return ts("summaryFree");

    if (hasScheduledCancellation && subscriptionEndsAt) {
      return ts("summaryCancels", {
        label: subscriptionLabel,
        date: formatDate(subscriptionEndsAt),
      });
    }

    if (hasActivePremiumTrial) {
      return premiumTrialDaysLeft === 1
        ? ts("summaryTrialOne")
        : ts("summaryTrialMany", { count: premiumTrialDaysLeft });
    }

    if (isStackPlan) {
      const stackSummary = canManageStack
        ? ts("summaryStackOwner")
        : ts("summaryStackMember", { name: stackOwnerDisplayName });

      if (hasScheduledPersonalCancellation && personalSubscriptionEndsAt) {
        return ts("summaryPersonalCancel", {
          summary: stackSummary,
          plan: personalPlanLabel,
          date: formatDate(personalSubscriptionEndsAt),
        });
      }

      return stackSummary;
    }

    if (isYearlyPlan) return ts("summaryYearly");
    if (isMonthlyPlan) return ts("summaryMonthly");
    return ts("summaryPremium");
  })();

  const subscriptionBadgeText = hasScheduledCancellation
    ? ts("badgeCancels", { label: subscriptionLabel })
    : subscriptionLabel;

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  const handleCopyFirebaseUid = async () => {
    if (!user.firebaseUid) {
      toast.error(t("uidUnavailable"));
      return;
    }

    try {
      await navigator.clipboard.writeText(user.firebaseUid);
      toast.success(t("uidCopied"));
    } catch {
      toast.error(t("uidCopyFailed"));
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast.error(tToast("profileDataUnavailable"));
      return;
    }

    if (!name.trim()) {
      toast.error(tToast("nameRequired"));
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

  const handleSaveFavoriteAgents = (agents: string[]) => {
    updateUser(
      {
        favoriteAgents: agents,
      },
      {
        onSuccess: () => {
          refetch();
        },
      },
    );
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
      toast.error(tToast("uidRequired"));
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
          <CardTitle as="h1">{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
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

            <ProfileLanguageSection />

            <ProfileFavoriteAgentsSection
              favoriteAgents={user.favoriteAgents ?? []}
              isSaving={isUpdatingUser}
              onSave={handleSaveFavoriteAgents}
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
              subscriptionStartedText={subscriptionStartedText}
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
                <div className="text-xs font-semibold">{t("memberSince")}</div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(new Date(user.createdAt))}
                </div>
              </div>

              <div className="space-y-2 text-end">
                <div className="text-xs font-semibold">{t("lastUpdated")}</div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(new Date(user.updatedAt))}
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
