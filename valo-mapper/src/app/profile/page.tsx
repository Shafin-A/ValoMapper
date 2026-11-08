import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CenteredPageShell } from "@/components/shared/centered-page-shell";
import { ProfileContent } from "@/components/profile/profile-content";

const ProfilePage = () => {
  return (
    <CenteredPageShell>
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileContent />
      </Suspense>
    </CenteredPageShell>
  );
};

const ProfileSkeleton = () => {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full" />
      </div>

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
