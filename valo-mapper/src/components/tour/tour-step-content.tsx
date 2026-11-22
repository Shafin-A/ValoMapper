"use client";

import { useTour } from "@/contexts/tour-context";
import { useTour as useReactour } from "@reactour/tour";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const TourStepContent = ({
  title,
  description,
  isAutoAdvanceStep = false,
}: {
  title: string;
  description: string;
  isAutoAdvanceStep?: boolean;
}) => {
  const { closeTour, markTourAsCompleted, autoAdvanceState } = useTour();
  const { setIsOpen, currentStep, steps, setCurrentStep } = useReactour();
  const t = useTranslations("tour");

  const shouldShowNextButton =
    !isAutoAdvanceStep ||
    (currentStep === 1 && autoAdvanceState.step1Advanced) ||
    (currentStep === 3 && autoAdvanceState.step3Advanced) ||
    (currentStep === 4 && autoAdvanceState.step4Advanced);

  const handleSkip = () => {
    closeTour();
    setIsOpen(false);
    markTourAsCompleted();
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      closeTour();
      setIsOpen(false);
      markTourAsCompleted();
    }
  };

  return (
    <Card className="min-w-[400px] p-5">
      <CardHeader className="p-0 pb-4">
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription className="whitespace-pre-line">
          {description}
        </CardDescription>
      </CardHeader>
      <CardFooter className="p-0 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={handleSkip}>
          {t("skip")}
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            {t("previous")}
          </Button>
          {shouldShowNextButton && (
            <Button variant="default" size="sm" onClick={handleNext}>
              {currentStep === steps.length - 1
                ? t("finish")
                : t("nextStep", {
                    current: currentStep + 1,
                    total: steps.length,
                  })}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};
