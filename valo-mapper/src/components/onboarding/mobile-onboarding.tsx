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
import { cn } from "@/lib/utils";

type OnboardingStep = {
  title: string;
  description: string;
  icon: LucideIcon;
};

const STEPS: OnboardingStep[] = [
  {
    title: "Place items",
    description:
      "Tap an agent, ability, or icon in the sidebar, then tap the map to place it. You can also drag it onto the map.",
    icon: MousePointerClick,
  },
  {
    title: "Zoom and pan",
    description:
      "Pinch with two fingers to zoom and drag the map to pan. Use the floating +/−/Fit controls for precise edits.",
    icon: Hand,
  },
  {
    title: "Item actions",
    description:
      "Long-press an item on the map to duplicate it, switch teams, swap abilities, or delete it. You can also drag it to the trash zone.",
    icon: Menu,
  },
  {
    title: "Quick toolbar",
    description:
      "Use the bottom bar for undo/redo, draw, erase, delete, and recenter. The buttons at each end open the tools and agents sidebars.",
    icon: SlidersHorizontal,
  },
  {
    title: "Edit text",
    description:
      "Tap a text item to open the full-screen editor. Use Done to save it, and Enter to add a new line.",
    icon: Type,
  },
];

export const MobileOnboarding = ({ ready }: { ready: boolean }) => {
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

  const step = STEPS[stepIndex];
  const StepIcon = step.icon;
  const isLastStep = stepIndex === STEPS.length - 1;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85dvh] gap-0 overflow-y-auto rounded-t-xl pb-[env(safe-area-inset-bottom)]"
      >
        <SheetHeader className="border-b px-4 pb-3 pr-10 text-left">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Mobile quick start
          </p>
          <SheetTitle className="text-xl">{step.title}</SheetTitle>
          <SheetDescription>{step.description}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 py-4">
          <div className="flex h-32 items-center justify-center rounded-xl border bg-muted/30">
            <StepIcon className="size-14 text-primary" />
          </div>

          <div
            className="flex items-center justify-center gap-1.5"
            aria-label={`Step ${stepIndex + 1} of ${STEPS.length}`}
          >
            {STEPS.map((entry, index) => (
              <span
                key={entry.title}
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
            Skip
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={stepIndex === 0}
              onClick={() => setStepIndex((index) => Math.max(0, index - 1))}
            >
              Back
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
              {isLastStep ? "Done" : "Next"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
