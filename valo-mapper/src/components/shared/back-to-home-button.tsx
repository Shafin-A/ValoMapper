"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { usePreviousPathname } from "@/components/providers/navigation-history-provider";
import { cn } from "@/lib/cn";
import { useTranslations } from "next-intl";

interface BackToHomeButtonProps {
  className?: string;
}

export const BackToHomeButton = ({ className }: BackToHomeButtonProps) => {
  const router = useRouter();
  const t = useTranslations("common");
  const previousPathname = usePreviousPathname();
  const returnsToHome = previousPathname === null || previousPathname === "/";
  const label = returnsToHome ? t("backToHome") : t("back");

  return (
    <Button
      asChild
      variant="ghost"
      size="sm"
      className={cn("-ms-2 text-white/60 hover:text-white", className)}
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
        <ArrowLeft className="rtl:rotate-180" />
        {label}
      </Link>
    </Button>
  );
};
