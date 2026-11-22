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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useHasCoarsePointer } from "@/hooks/use-has-coarse-pointer";
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
  const hasCoarsePointer = useHasCoarsePointer();

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
      {variant === "inline" || hasCoarsePointer ? (
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side={side} sideOffset={6}>
            {t("label")}
          </TooltipContent>
        </Tooltip>
      )}
      <DropdownMenuContent
        align={align}
        side={side}
        collisionPadding={8}
        className="w-72 max-w-[calc(100vw-1rem)] overflow-hidden p-0"
      >
        <ScrollArea
          type="auto"
          className="w-full **:data-[slot=scroll-area-viewport]:overscroll-contain"
          style={{
            height:
              "min(20rem, 60dvh, calc(var(--radix-dropdown-menu-content-available-height, 20rem) - 2px))",
          }}
        >
          <div className="p-1 pr-6">
            <DropdownMenuLabel>{t("label")}</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={locale}
              onValueChange={handleValueChange}
            >
              {LAUNCH_LOCALES.map((code) => (
                <DropdownMenuRadioItem
                  key={code}
                  value={code}
                  lang={code}
                  className="gap-2"
                >
                  <span className="truncate">
                    {LOCALE_META[code].nativeName}
                  </span>
                  <DropdownMenuShortcut>
                    {LOCALE_META[code].englishName}
                  </DropdownMenuShortcut>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
