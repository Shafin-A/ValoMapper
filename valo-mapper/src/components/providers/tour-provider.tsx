"use client";

import { TourProvider as TourContextProvider } from "@/contexts/tour-context";
import { useTour } from "@/contexts/tour-context";
import {
  TourProvider as ReactourProvider,
  useTour as useReactour,
} from "@reactour/tour";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { tourSteps } from "@/components/tour/tour-steps";

const TourContent = ({ children }: { children: React.ReactNode }) => {
  const { hasCompletedTour, startTour, isTourOpen } = useTour();
  const pathname = usePathname();
  const isLobbyPage = pathname && pathname.match(/^\/[^\/]+$/);

  useEffect(() => {
    if (!hasCompletedTour && !isTourOpen && isLobbyPage) {
      const timer = setTimeout(() => {
        startTour();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasCompletedTour, startTour, isTourOpen, isLobbyPage]);

  return <>{children}</>;
};

export const TourProviderWrapper = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <TourContextProvider>
      <ReactourProvider
        steps={tourSteps}
        styles={{
          popover: (base) => ({
            ...base,
            backgroundColor: "transparent",
            padding: 0,
            boxShadow: "none",
            maxWidth: "600px",
          }),
          maskArea: (base) => ({ ...base, rx: 8 }),
          badge: () => ({
            display: "none",
          }),
          controls: (base) => ({
            ...base,
            display: "none",
          }),
          close: (base) => ({
            ...base,
            display: "none",
          }),
        }}
        padding={{ mask: 10, popover: [10, 10] }}
        onClickMask={() => {
          // Disable closing on mask click
        }}
      >
        <TourContentWrapper>{children}</TourContentWrapper>
      </ReactourProvider>
    </TourContextProvider>
  );
};

const TourContentWrapper = ({ children }: { children: React.ReactNode }) => {
  const { isTourOpen, markTourAsCompleted } = useTour();
  const { setIsOpen, currentStep } = useReactour();

  useEffect(() => {
    setIsOpen(isTourOpen);
  }, [isTourOpen, setIsOpen]);

  useEffect(() => {
    if (!isTourOpen && currentStep > 0) {
      markTourAsCompleted();
    }
  }, [isTourOpen, currentStep, markTourAsCompleted]);

  return <TourContent>{children}</TourContent>;
};
