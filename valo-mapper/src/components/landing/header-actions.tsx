"use client";

import { Button } from "@/components/ui/button";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const HeaderActions = () => {
  const pathname = usePathname();
  const { user, logout } = useFirebaseAuth();

  if (!user) {
    return (
      <div className="absolute top-8 right-8 flex gap-3">
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
        <Link href="/strategies">My Strategies</Link>
      </Button>
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
