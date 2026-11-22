"use client";

import { useTranslations } from "next-intl";

import { Label } from "@/components/ui/label";
import { LanguageSwitcher } from "./language-switcher";

export const ProfileLanguageSection = () => {
  const t = useTranslations("language");

  return (
    <div className="space-y-2 border-t pt-4">
      <Label>{t("profileTitle")}</Label>
      <LanguageSwitcher variant="inline" />
      <p className="text-xs text-muted-foreground">
        {t("profileDescription")} {t("deviceOnly")}
      </p>
    </div>
  );
};
