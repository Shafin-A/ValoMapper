"use client";

import { useCanvas } from "@/contexts/canvas-context";
import { useTour } from "@/contexts/tour-context";
import { useTour as useReactour } from "@reactour/tour";
import { useEffect, useRef } from "react";

export const TourAutoAdvance = () => {
  const { isTourOpen, autoAdvanceState, markStepAdvanced } = useTour();
  const { currentStep, setCurrentStep } = useReactour();
  const { selectedCanvasIcon } = useCanvas();
  const previousSelectedIconRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isTourOpen) {
      previousSelectedIconRef.current = null;
    }
  }, [isTourOpen]);

  useEffect(() => {
    if (
      isTourOpen &&
      currentStep === 1 &&
      !autoAdvanceState.step1Advanced &&
      selectedCanvasIcon?.name === "Brimstone"
    ) {
      const timer = setTimeout(() => {
        setCurrentStep(2);
        markStepAdvanced(1);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [
    isTourOpen,
    currentStep,
    selectedCanvasIcon,
    setCurrentStep,
    autoAdvanceState.step1Advanced,
    markStepAdvanced,
  ]);

  useEffect(() => {
    if (isTourOpen && currentStep === 3 && !autoAdvanceState.step3Advanced) {
      const checkAbilitiesPanel = setInterval(() => {
        const abilitiesButton = document.querySelector(
          '[data-tour="brimstone-abilities-button"][data-state="on"]',
        );
        if (abilitiesButton) {
          setTimeout(() => {
            setCurrentStep(4);
            markStepAdvanced(3);
          }, 150);
          clearInterval(checkAbilitiesPanel);
        }
      }, 100);

      return () => clearInterval(checkAbilitiesPanel);
    }
  }, [
    isTourOpen,
    currentStep,
    setCurrentStep,
    autoAdvanceState.step3Advanced,
    markStepAdvanced,
  ]);

  useEffect(() => {
    if (isTourOpen && currentStep === 4 && !autoAdvanceState.step4Advanced) {
      if (
        selectedCanvasIcon &&
        selectedCanvasIcon.name !== "Brimstone" &&
        previousSelectedIconRef.current !== selectedCanvasIcon.name
      ) {
        previousSelectedIconRef.current = selectedCanvasIcon.name;
        const timer = setTimeout(() => {
          setCurrentStep(5);
          markStepAdvanced(4);
        }, 250);
        return () => clearTimeout(timer);
      }
    }
  }, [
    isTourOpen,
    currentStep,
    selectedCanvasIcon,
    setCurrentStep,
    autoAdvanceState.step4Advanced,
    markStepAdvanced,
  ]);

  return null;
};
