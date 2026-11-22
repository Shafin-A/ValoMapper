"use client";

import { useEffect, useState } from "react";
import {
  Hand,
  Menu,
  MousePointerClick,
  SlidersHorizontal,
  Type,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  hasSeenOnboarding,
  markMobileOnboardingCompleted,
  markOnboardingSeen,
} from "@/lib/onboarding";
import { cn } from "@/lib/cn";
import { useTranslations } from "next-intl";

const STEP_DEFS = [
  { titleKey: "placeTitle", descriptionKey: "placeDescription", icon: MousePointerClick },
  { titleKey: "zoomTitle", descriptionKey: "zoomDescription", icon: Hand },
  { titleKey: "actionsTitle", descriptionKey: "actionsDescription", icon: Menu },
  { titleKey: "toolbarTitle", descriptionKey: "toolbarDescription", icon: SlidersHorizontal },
  { titleKey: "textTitle", descriptionKey: "textDescription", icon: Type },
] as const satisfies ReadonlyArray<{
  titleKey: string;
  descriptionKey: string;
  icon: LucideIcon;
}>;

export const MobileOnboarding = ({ ready }: { ready: boolean }) => {
  const t = useTranslations("onboarding");
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!isMobile || !ready || hasSeenOnboarding()) return;

    const timer = window.setTimeout(() => {
      markOnboardingSeen();
      setOpen(true);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [isMobile, ready]);

  if (!isMobile) {
    return null;
  }

  const complete = () => {
    markMobileOnboardingCompleted();
    setOpen(false);
    setStepIndex(0);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      complete();
      return;
    }

    setOpen(nextOpen);
  };

  const stepDef = STEP_DEFS[stepIndex];
  const StepIcon = stepDef.icon;
  const isLastStep = stepIndex === STEP_DEFS.length - 1;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85dvh] gap-0 overflow-y-auto rounded-t-xl pb-[env(safe-area-inset-bottom)]"
      >
        <SheetHeader className="border-b px-4 pb-3 pr-10 text-start">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {t("quickStart")}
          </p>
          <SheetTitle className="text-xl">{t(stepDef.titleKey)}</SheetTitle>
          <SheetDescription>{t(stepDef.descriptionKey)}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 py-4">
          <div className="flex h-32 items-center justify-center rounded-xl border bg-muted/30">
            <StepIcon className="size-14 text-primary" />
          </div>

          <div
            className="flex items-center justify-center gap-1.5"
            aria-label={t("step", {
              current: stepIndex + 1,
              total: STEP_DEFS.length,
            })}
          >
            {STEP_DEFS.map((entry, index) => (
              <span
                key={entry.titleKey}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  index === stepIndex
                    ? "w-5 bg-primary"
                    : "w-1.5 bg-muted-foreground/30",
                )}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t px-4 py-3">
          <Button variant="ghost" onClick={complete}>
            {t("skip")}
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={stepIndex === 0}
              onClick={() => setStepIndex((index) => Math.max(0, index - 1))}
            >
              {t("back")}
            </Button>
            <Button
              onClick={() => {
                if (isLastStep) {
                  complete();
                } else {
                  setStepIndex((index) => index + 1);
                }
              }}
            >
              {isLastStep ? t("done") : t("next")}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
