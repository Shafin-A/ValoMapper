"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { FieldDescription } from "@/components/ui/field";
import { useTranslations } from "next-intl";

interface RiotSignInButtonProps {
  href: string;
  label?: string;
  disabled?: boolean;
  showDisclaimer?: boolean;
  className?: string;
}

export const RiotSignInButton = ({
  href,
  label,
  disabled = false,
  showDisclaimer = true,
  className,
}: RiotSignInButtonProps) => {
  const t = useTranslations("auth");
  const resolvedLabel = label ?? t("riotSignIn");

  return (
    <div className={className}>
      <Button
        className="w-full bg-[#d3362f] border border-[#d3362f] hover:bg-[#d3362f]/80 text-white"
        asChild
        disabled={disabled}
      >
        <a
          href={disabled ? "#" : href}
          aria-disabled={disabled}
          className="flex items-center justify-center gap-2"
        >
          <Image
            src="/riot_fist.svg"
            alt={t("riotLogoAlt")}
            width={573}
            height={532}
            className="h-6 w-auto"
          />
          {disabled ? t("riotNotConfigured") : resolvedLabel}
        </a>
      </Button>
      {showDisclaimer && (
        <FieldDescription className="mt-2 text-center text-xs text-muted-foreground">
          {t("riotDisclaimer")}
        </FieldDescription>
      )}
    </div>
  );
};
