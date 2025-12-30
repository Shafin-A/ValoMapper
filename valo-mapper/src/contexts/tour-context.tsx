"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { useUser } from "@/hooks/api/use-user";
import { useUpdateUser } from "@/hooks/api/use-update-user";

interface TourContextType {
  isTourOpen: boolean;
  startTour: () => void;
  closeTour: () => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  hasCompletedTour: boolean;
  markTourAsCompleted: () => void;
  autoAdvanceState: {
    step1Advanced: boolean;
    step3Advanced: boolean;
    step4Advanced: boolean;
  };
  markStepAdvanced: (step: 1 | 3 | 4) => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export const useTour = () => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error("useTour must be used within a TourProvider");
  }
  return context;
};

export const TourProvider = ({ children }: { children: React.ReactNode }) => {
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const { data: user } = useUser();
  const updateUser = useUpdateUser();
  const [hasCompletedTour, setHasCompletedTour] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("valomapper-tour-completed") === "true";
    }
    return false;
  });

  const [autoAdvanceState, setAutoAdvanceState] = useState({
    step1Advanced: false,
    step3Advanced: false,
    step4Advanced: false,
  });

  useEffect(() => {
    if (user && user.tourCompleted) {
      setHasCompletedTour(user.tourCompleted);
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "valomapper-tour-completed",
          user.tourCompleted ? "true" : "false"
        );
      }
    }
  }, [user]);

  const startTour = useCallback(() => {
    setIsTourOpen(true);
    setCurrentStep(0);
  }, []);

  const closeTour = useCallback(() => {
    setIsTourOpen(false);
    setCurrentStep(0);
    setAutoAdvanceState({
      step1Advanced: false,
      step3Advanced: false,
      step4Advanced: false,
    });
  }, []);

  const markTourAsCompleted = useCallback(() => {
    setHasCompletedTour(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("valomapper-tour-completed", "true");
    }
    if (user && !user.tourCompleted) {
      updateUser.mutate({ tourCompleted: true });
    }
  }, [user, updateUser]);

  const markStepAdvanced = useCallback((step: 1 | 3 | 4) => {
    setAutoAdvanceState((prev) => ({
      ...prev,
      [`step${step}Advanced`]: true,
    }));
  }, []);

  return (
    <TourContext.Provider
      value={{
        isTourOpen,
        startTour,
        closeTour,
        currentStep,
        setCurrentStep,
        hasCompletedTour,
        markTourAsCompleted,
        autoAdvanceState,
        markStepAdvanced,
      }}
    >
      {children}
    </TourContext.Provider>
  );
};
