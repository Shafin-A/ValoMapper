import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

export const ProfileNotAuthenticatedCard = () => {
  return (
    <div className="w-full">
      <Card>
        <CardHeader>
          <CardTitle as="h1">Profile</CardTitle>
          <CardDescription>Please log in to view your profile</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Not Authenticated</AlertTitle>
            <AlertDescription>
              Please log in to view your profile.
            </AlertDescription>
          </Alert>
          <Button asChild className="w-full">
            <Link href="/login?redirect=%2Fprofile">Log in</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export const ProfileLoadingCard = () => {
  return (
    <div className="w-full">
      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-32" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-48 mt-2" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-10 w-full" />
              </div>
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
};

export const ProfileUserDataNotFoundCard = () => {
  return (
    <div className="w-full">
      <Card>
        <CardHeader>
          <CardTitle as="h1">Profile</CardTitle>
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
};
