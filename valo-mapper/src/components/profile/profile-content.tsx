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
import { useRouter } from "next/navigation";
import { AlertCircle, LogOut, Home, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import { useDeleteUser } from "@/hooks/api/use-delete-user";

export const ProfileContent = () => {
  const { data: user, isLoading, refetch } = useUser();
  const { logout, user: firebaseUser } = useFirebaseAuth();
  const { mutate: updateUser, isPending: isUpdatingUser } = useUpdateUser();
  const { mutate: deleteUser, isPending: isDeletingUser } = useDeleteUser();
  const router = useRouter();

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
                disabled={!isEditing || isUpdatingUser}
                placeholder="Your name"
              />
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
                  <Button onClick={() => setIsEditing(true)} className="flex-1">
                    Edit Profile
                  </Button>
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
                      name.trim() === user.name.trim()
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
