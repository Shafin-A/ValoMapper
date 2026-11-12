"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { usePreviousPathname } from "@/components/providers/navigation-history-provider";
import { cn } from "@/lib/cn";

interface BackToHomeButtonProps {
  className?: string;
}

export const BackToHomeButton = ({ className }: BackToHomeButtonProps) => {
  const router = useRouter();
  const previousPathname = usePreviousPathname();
  const returnsToHome = previousPathname === null || previousPathname === "/";
  const label = returnsToHome ? "Back to ValoMapper" : "Back";

  return (
    <Button
      asChild
      variant="ghost"
      size="sm"
      className={cn("-ml-2 text-white/60 hover:text-white", className)}
    >
      <Link
        href="/"
        aria-label={label}
        onClick={(event) => {
          if (!returnsToHome) {
            event.preventDefault();
            router.back();
          }
        }}
      >
        <ArrowLeft />
        {label}
      </Link>
    </Button>
  );
};
