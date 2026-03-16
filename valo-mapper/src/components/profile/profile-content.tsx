"use client";

import { useUser } from "@/hooks/api/use-user";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useUpdateUser } from "@/hooks/api/use-update-user";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Copy,
  Home,
  Loader2,
  LogOut,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import { useDeleteUser } from "@/hooks/api/use-delete-user";
import { useCancelSubscription } from "@/hooks/api/use-cancel-subscription";
import { useResumeSubscription } from "@/hooks/api/use-resume-subscription";
import { CheckoutPlanDialog } from "@/components/billing/checkout-plan-dialog";
import { useStackMembers } from "@/hooks/api/use-stack-members";
import { useInviteStackMember } from "@/hooks/api/use-invite-stack-member";
import { useRemoveStackMember } from "@/hooks/api/use-remove-stack-member";
import { usePendingStackInvite } from "@/hooks/api/use-pending-stack-invite";
import { useAcceptStackInvite } from "@/hooks/api/use-accept-stack-invite";
import { useLeaveStack } from "@/hooks/api/use-leave-stack";

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
  const { mutate: leaveStack, isPending: isDecliningStackInvite } =
    useLeaveStack();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isStackPlan = user?.subscriptionPlan === "stack";
  const canCheckPendingInvite = Boolean(user) && !isStackPlan;
  const {
    data: pendingStackInvite,
    isLoading: isPendingStackInviteLoading,
    refetch: refetchPendingStackInvite,
  } = usePendingStackInvite(canCheckPendingInvite);
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

  if (!firebaseUser && !isLoggingOut && !isDeletingUser) {
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
              Profile
            </CardTitle>
            <CardDescription>
              Please log in to view your profile
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Not Authenticated</AlertTitle>
              <AlertDescription>
                Please log in to view your profile.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || isLoggingOut || isDeletingUser) {
    return (
      <div className="w-full">
        <Card>
          <CardHeader>
            <CardTitle className="flex gap-2 items-center">
              <Skeleton className="h-10 w-10 rounded" />
              <Skeleton className="h-6 w-32" />
            </CardTitle>
            <CardDescription>
              <Skeleton className="h-4 w-48 mt-2" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-10" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
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
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>User Data Not Found</AlertTitle>
              <AlertDescription>
                Could not load your profile information.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
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
  const hasPendingStackInvite = Boolean(pendingStackInvite);
  const isPendingInviteAction =
    isAcceptingStackInvite || isDecliningStackInvite;
  const pendingInviteSentAt = pendingStackInvite?.invitedAt
    ? new Date(pendingStackInvite.invitedAt)
    : null;
  const pendingInviteOwnerDisplay = pendingStackInvite
    ? pendingStackInvite.ownerName?.trim() ||
      pendingStackInvite.ownerEmail?.trim() ||
      `User #${pendingStackInvite.ownerUserId}`
    : null;

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

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
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

  const handleAcceptPendingInvite = () => {
    if (!pendingStackInvite) {
      return;
    }

    acceptStackInvite(pendingStackInvite.id, {
      onSuccess: () => {
        refetch();
        refetchPendingStackInvite();
        refetchStackMembers();
      },
    });
  };

  const handleDeclinePendingInvite = () => {
    leaveStack(undefined, {
      onSuccess: () => {
        refetch();
        refetchPendingStackInvite();
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
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={handleNameChange}
                disabled={isRSOUser || !isEditing || isUpdatingUser}
                placeholder="Your name"
              />
              {isRSOUser && (
                <p className="text-xs text-muted-foreground">
                  Managed by Riot Sign-On. This name updates from your Riot Game
                  Name and Tagline.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user.email || ""}
                disabled
                className="bg-muted"
              />
              {isRSOUser && (
                <p className="text-xs text-muted-foreground">
                  Email is managed by Riot Sign-On.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="firebase-uid">UID</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="firebase-uid"
                  value={user.firebaseUid || ""}
                  disabled
                  className="bg-muted font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyFirebaseUid}
                  disabled={!user.firebaseUid}
                  aria-label="Copy UID"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this UID with a stack owner so they can invite you.
              </p>
            </div>

            {!isStackPlan &&
              (isPendingStackInviteLoading || hasPendingStackInvite) && (
                <Alert className="border-amber-200 bg-stone-50 text-stone-900 shadow-sm dark:border-amber-900/70 dark:bg-zinc-900 dark:text-zinc-100">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <AlertTitle>Pending Stack Invite</AlertTitle>
                  <AlertDescription className="space-y-2 text-stone-700 dark:text-zinc-300">
                    {isPendingStackInviteLoading ? (
                      <p className="text-xs">Checking for pending invites...</p>
                    ) : (
                      <>
                        <p className="text-xs">
                          {`You have a pending invite to join ${pendingInviteOwnerDisplay}'s Premium Stack.`}
                          {pendingInviteSentAt &&
                          !Number.isNaN(pendingInviteSentAt.getTime())
                            ? ` Sent ${pendingInviteSentAt.toLocaleDateString(
                                "en-US",
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                },
                              )}.`
                            : ""}
                        </p>
                        <p className="text-xs">
                          Accepting will activate stack membership and any
                          personal paid subscription will be scheduled to cancel
                          at period end.
                        </p>
                        <div className="flex gap-2 pt-1">
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleAcceptPendingInvite}
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
                            onClick={handleDeclinePendingInvite}
                            disabled={isPendingInviteAction}
                          >
                            {isDecliningStackInvite && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Decline
                          </Button>
                        </div>
                      </>
                    )}
                  </AlertDescription>
                </Alert>
              )}

            <div className="space-y-2">
              <div className="text-xs font-semibold">Subscription</div>
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <span className="text-sm">ValoMapper Premium</span>
                <span
                  className={`text-xs font-semibold ${
                    hasScheduledCancellation
                      ? "text-amber-600"
                      : hasActivePremiumTrial
                        ? "text-emerald-700"
                        : hasValoMapperPremium
                          ? "text-primary"
                          : "text-muted-foreground"
                  }`}
                >
                  {subscriptionBadgeText}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {subscriptionSummary}
              </p>
              <div className="pt-1">
                {hasValoMapperPremium ? (
                  isStackPlan && isStackMembersLoading ? (
                    <p className="text-xs text-muted-foreground">
                      Loading stack billing permissions...
                    </p>
                  ) : hasScheduledCancellation ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleResumeSubscription}
                      disabled={isResumePending}
                    >
                      {isResumePending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Undo Cancellation
                    </Button>
                  ) : (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={isCancelPending || isResumePending}
                        >
                          {isCancelPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Cancel Subscription
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Cancel your subscription?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Your subscription will be set to cancel at the end
                            of your current billing period. You will keep
                            ValoMapper Premium access until then.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>
                            Keep Subscription
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleCancelSubscription}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/70"
                          >
                            Confirm Cancel
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )
                ) : (
                  <CheckoutPlanDialog
                    returnToPath={returnToPath}
                    trigger={<Button size="sm">Upgrade to Premium</Button>}
                  />
                )}
              </div>
            </div>

            {isStackPlan && (
              <div className="space-y-3 rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium">
                    Premium Stack Members ({stackSeatCount}/6)
                  </p>
                </div>

                {canManageStack && (
                  <div className="space-y-2">
                    <Label htmlFor="stack-invite-uid">Invite by UID</Label>
                    <div className="flex gap-2">
                      <Input
                        id="stack-invite-uid"
                        value={inviteFirebaseUid}
                        onChange={(e) => setInviteFirebaseUid(e.target.value)}
                        placeholder="Enter UID"
                        disabled={isInvitingStackMember}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleInviteStackMember();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        onClick={handleInviteStackMember}
                        disabled={
                          isInvitingStackMember || !inviteFirebaseUid.trim()
                        }
                      >
                        {isInvitingStackMember ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <UserPlus className="mr-2 h-4 w-4" />
                        )}
                        Invite
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Add members with their UID.
                    </p>
                  </div>
                )}

                {isStackMembersLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : stackMembersError ? (
                  <p className="text-xs text-destructive">
                    Failed to load stack members: {stackMembersError.message}
                  </p>
                ) : !stackOwner && stackMembers.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No stack members found.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {stackOwner && (
                      <div className="flex items-center justify-between rounded-md border px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {stackOwnerDisplayName}
                            {" (Owner)"}
                            {stackOwner.userId === user.id ? " (You)" : ""}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {stackOwnerDisplayEmail}
                          </p>
                        </div>
                      </div>
                    )}
                    {stackMembers.map((member) => {
                      const displayName =
                        member.memberName?.trim() || "Unnamed";
                      const displayEmail = member.memberEmail?.trim() || "";
                      const isCurrentUser = member.memberUserId === user.id;

                      return (
                        <div
                          key={member.id}
                          className="flex items-center justify-between rounded-md border px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {displayName}
                              {isCurrentUser ? " (You)" : ""}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {displayEmail}
                            </p>
                            {member.status === "pending" && (
                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                {member.status}
                              </p>
                            )}
                          </div>
                          {canManageStack && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRemoveStackMember(member.id)}
                              disabled={isRemovingStackMember}
                            >
                              {isRemovingStackMember && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              )}
                              Remove
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

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

            <div className="flex gap-2 pt-4">
              {!isEditing ? (
                <>
                  {!isRSOUser && (
                    <Button
                      onClick={() => setIsEditing(true)}
                      className="flex-1"
                    >
                      Edit Profile
                    </Button>
                  )}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={handleLogout}
                          variant="outline"
                          size="icon"
                        >
                          <LogOut className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Log out</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </>
              ) : (
                <>
                  <Button
                    onClick={handleSave}
                    disabled={
                      isUpdatingUser ||
                      !name.trim() ||
                      name.trim() === currentUserName
                    }
                    className="flex-1"
                  >
                    {isUpdatingUser ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    disabled={isUpdatingUser}
                  >
                    Cancel
                  </Button>
                </>
              )}
            </div>

            {!isEditing && (
              <div className="pt-6 border-t">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full gap-2">
                      <Trash2 className="h-4 w-4" />
                      Delete Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Are you absolutely sure?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently
                        delete your account and remove all your data from our
                        servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/70"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
