"use client";

import { Button } from "@/components/ui/button";

export const HeaderActions = () => {
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
        className="transition-all hover:scale-105 will-change-transform"
      >
        Login / Register
      </Button>
    </div>
  );
};
