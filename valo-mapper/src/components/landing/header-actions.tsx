"use client";

import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/api/use-user";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";

const WhatsNewButton = () => {
  const t = useTranslations("nav");

  return (
    <Button
      variant="ghost"
      className="px-2 transition-all hover:scale-105 will-change-transform sm:px-4"
      asChild
    >
      <Link href="/whats-new" aria-label={t("whatsNew")}>
        <Sparkles className="size-4 sm:hidden" aria-hidden />
        <span className="hidden sm:inline">{t("whatsNew")}</span>
      </Link>
    </Button>
  );
};

export const HeaderActions = () => {
  const pathname = usePathname();
  const { user, logout } = useFirebaseAuth();
  const { data: userProfile } = useUser();
  const t = useTranslations("nav");

  const isRSOUser = Boolean(userProfile?.rsoSubjectId);

  if (!user) {
    return (
      <div className="absolute top-8 right-8 flex items-center gap-3">
        <LanguageSwitcher className="transition-all hover:scale-105 will-change-transform" />
        <Button
          variant="ghost"
          className="transition-all hover:scale-105 will-change-transform"
          asChild
        >
          <Link href="/replay">{t("replays")}</Link>
        </Button>
        <WhatsNewButton />
        <Button
          variant="outline"
          className="transition-all hover:scale-105 will-change-transform"
          asChild
        >
          <Link href={`/login?redirect=${encodeURIComponent(pathname)}`}>
            {t("login")}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="absolute top-8 right-8 flex items-center gap-3">
      <LanguageSwitcher className="transition-all hover:scale-105 will-change-transform" />
      <Button
        variant="ghost"
        className="transition-all hover:scale-105 will-change-transform"
        asChild
      >
        <Link href="/replay">{t("replays")}</Link>
      </Button>
      <WhatsNewButton />
      <Button
        variant="ghost"
        className="transition-all hover:scale-105 will-change-transform"
        asChild
      >
        <Link href="/strategies">{t("myStrategies")}</Link>
      </Button>
      <Button
        variant="ghost"
        className="transition-all hover:scale-105 will-change-transform"
        asChild
      >
        <Link href="/profile">{t("myProfile")}</Link>
      </Button>
      {isRSOUser && (
        <Button
          variant="ghost"
          className="transition-all hover:scale-105 will-change-transform"
          asChild
        >
          <Link href="/matches">{t("myMatches")}</Link>
        </Button>
      )}
      <Button
        variant="outline"
        onClick={logout}
        className="transition-all hover:scale-105 will-change-transform"
      >
        {t("logout")}
      </Button>
    </div>
  );
};
