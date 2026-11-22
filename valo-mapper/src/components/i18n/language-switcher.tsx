"use client";

import { ChevronDown, Languages, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setLocale } from "@/i18n/actions";
import {
  isLaunchLocale,
  LAUNCH_LOCALES,
  LOCALE_META,
  type Locale,
} from "@/i18n/config";
import { cn } from "@/lib/cn";

type LanguageSwitcherProps = {
  variant?: "icon" | "inline";
  className?: string;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
};

export const LanguageSwitcher = ({
  variant = "icon",
  className,
  align = "end",
  side = "bottom",
}: LanguageSwitcherProps) => {
  const locale = useLocale() as Locale;
  const t = useTranslations("language");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const current = LOCALE_META[locale] ?? LOCALE_META["en-US"];

  const handleValueChange = (nextLocale: string) => {
    if (!isLaunchLocale(nextLocale) || nextLocale === locale) return;

    startTransition(async () => {
      await setLocale(nextLocale);
      router.refresh();
    });
  };

  const trigger =
    variant === "inline" ? (
      <Button
        type="button"
        variant="outline"
        className={cn("h-10 w-full justify-between gap-2", className)}
        disabled={isPending}
        aria-label={t("current", { language: current.nativeName })}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Languages className="size-4 shrink-0" aria-hidden />
          <span className="truncate">{current.nativeName}</span>
        </span>
        {isPending ? (
          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
        ) : (
          <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden />
        )}
      </Button>
    ) : (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn("h-10 w-10 sm:h-8 sm:w-8", className)}
        disabled={isPending}
        aria-label={t("label")}
        title={t("label")}
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Languages className="size-4" aria-hidden />
        )}
      </Button>
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        side={side}
        className="max-h-80 w-64 overflow-y-auto"
      >
        <DropdownMenuLabel>{t("label")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={locale} onValueChange={handleValueChange}>
          {LAUNCH_LOCALES.map((code) => (
            <DropdownMenuRadioItem
              key={code}
              value={code}
              lang={code}
              className="gap-2"
            >
              <span className="truncate">{LOCALE_META[code].nativeName}</span>
              <DropdownMenuShortcut>
                {LOCALE_META[code].englishName}
              </DropdownMenuShortcut>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
