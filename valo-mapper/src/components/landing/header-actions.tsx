"use client";

import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/api/use-user";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const WhatsNewButton = () => (
  <Button
    variant="ghost"
    className="px-2 transition-all hover:scale-105 will-change-transform sm:px-4"
    asChild
  >
    <Link href="/whats-new" aria-label="What's New">
      <Sparkles className="size-4 sm:hidden" aria-hidden />
      <span className="hidden sm:inline">What&apos;s New</span>
    </Link>
  </Button>
);

export const HeaderActions = () => {
  const pathname = usePathname();
  const { user, logout } = useFirebaseAuth();
  const { data: userProfile } = useUser();

  const isRSOUser = Boolean(userProfile?.rsoSubjectId);

  if (!user) {
    return (
      <div className="absolute top-8 right-8 flex gap-3">
        <Button
          variant="ghost"
          className="transition-all hover:scale-105 will-change-transform"
          asChild
        >
          <Link href="/replay">Replays</Link>
        </Button>
        <WhatsNewButton />
        <Button
          variant="outline"
          className="transition-all hover:scale-105 will-change-transform"
          asChild
        >
          <Link href={`/login?redirect=${encodeURIComponent(pathname)}`}>
            Login
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="absolute top-8 right-8 flex gap-3">
      <Button
        variant="ghost"
        className="transition-all hover:scale-105 will-change-transform"
        asChild
      >
        <Link href="/replay">Replays</Link>
      </Button>
      <WhatsNewButton />
      <Button
        variant="ghost"
        className="transition-all hover:scale-105 will-change-transform"
        asChild
      >
        <Link href="/strategies">My Strategies</Link>
      </Button>
      <Button
        variant="ghost"
        className="transition-all hover:scale-105 will-change-transform"
        asChild
      >
        <Link href="/profile">My Profile</Link>
      </Button>
      {isRSOUser && (
        <Button
          variant="ghost"
          className="transition-all hover:scale-105 will-change-transform"
          asChild
        >
          <Link href="/matches">My Matches</Link>
        </Button>
      )}
      <Button
        variant="outline"
        onClick={logout}
        className="transition-all hover:scale-105 will-change-transform"
      >
        Logout
      </Button>
    </div>
  );
};
