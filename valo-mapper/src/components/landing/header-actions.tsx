"use client";

import { Button } from "@/components/ui/button";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { useRouter } from "next/navigation";

export const HeaderActions = () => {
  const router = useRouter();
  const { user, logout } = useFirebaseAuth();

  if (!user) {
    return (
      <div className="absolute top-8 right-8 flex gap-3">
        <Button
          variant="outline"
          onClick={() => router.push("/login")}
          className="transition-all hover:scale-105 will-change-transform"
        >
          Login
        </Button>
      </div>
    );
  }

  return (
    <div className="absolute top-8 right-8 flex gap-3">
      <Button
        variant="ghost"
        className="transition-all hover:scale-105 will-change-transform"
      >
        My Strategies
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
