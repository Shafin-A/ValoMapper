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
import { AlertCircle, Loader2, LogOut, Home, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import { useDeleteUser } from "@/hooks/api/use-delete-user";
import { useCreateCheckoutSession } from "@/hooks/api/use-create-checkout-session";
import { useCancelSubscription } from "@/hooks/api/use-cancel-subscription";
import { useResumeSubscription } from "@/hooks/api/use-resume-subscription";

export const ProfileContent = () => {
  const { data: user, isLoading, refetch } = useUser();
  const { logout, user: firebaseUser } = useFirebaseAuth();
  const { mutate: updateUser, isPending: isUpdatingUser } = useUpdateUser();
  const { mutate: deleteUser, isPending: isDeletingUser } = useDeleteUser();
  const { mutate: createCheckoutSession, isPending: isCheckoutPending } =
    useCreateCheckoutSession();
  const { mutate: cancelSubscription, isPending: isCancelPending } =
    useCancelSubscription();
  const { mutate: resumeSubscription, isPending: isResumePending } =
    useResumeSubscription();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [name, setName] = useState("");
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
  const hasValoMapperPro = Boolean(user.isSubscribed);
  const subscriptionEndsAt = user.subscriptionEndedAt
    ? new Date(user.subscriptionEndedAt)
    : null;
  const hasScheduledCancellation =
    hasValoMapperPro &&
    subscriptionEndsAt !== null &&
    !Number.isNaN(subscriptionEndsAt.getTime());
  const currentUserName = user.name?.trim() || "";
  const searchQuery = searchParams.toString();
  const returnToPath = searchQuery ? `${pathname}?${searchQuery}` : pathname;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
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

  const handleUpgrade = () => {
    createCheckoutSession({ returnTo: returnToPath });
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
              <div className="text-xs font-semibold">Subscription</div>
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <span className="text-sm">ValoMapper Pro</span>
                <span
                  className={`text-xs font-semibold ${
                    hasScheduledCancellation
                      ? "text-amber-600"
                      : hasValoMapperPro
                        ? "text-primary"
                        : "text-muted-foreground"
                  }`}
                >
                  {hasScheduledCancellation
                    ? "Cancels at Period End"
                    : hasValoMapperPro
                      ? "Active"
                      : "Inactive"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {hasScheduledCancellation && subscriptionEndsAt
                  ? `Your ValoMapper Pro subscription is active until ${subscriptionEndsAt.toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      },
                    )}.`
                  : hasValoMapperPro
                    ? "Your ValoMapper Pro subscription is active."
                    : "You are currently on the free plan."}
              </p>
              <div className="pt-1">
                {hasValoMapperPro ? (
                  hasScheduledCancellation ? (
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
                            ValoMapper Pro access until then.
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
                  <Button
                    size="sm"
                    onClick={handleUpgrade}
                    disabled={isCheckoutPending}
                  >
                    {isCheckoutPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Upgrade to Pro
                  </Button>
                )}
              </div>
            </div>

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
