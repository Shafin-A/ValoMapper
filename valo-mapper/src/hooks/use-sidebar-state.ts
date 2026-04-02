import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useIsMobile } from "@/hooks/use-mobile";

export const useSidebarState = () => {
  const isMobile = useIsMobile();
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);

  useEffect(() => {
    if (!isMobile) return;
    setLeftSidebarOpen(false);
    setRightSidebarOpen(false);
  }, [isMobile]);

  const setLeftSidebarOpenWithMobileRules: Dispatch<SetStateAction<boolean>> =
    useCallback(
      (value) => {
        setLeftSidebarOpen((prevLeft) => {
          const nextLeft =
            typeof value === "function" ? value(prevLeft) : value;

          if (isMobile && nextLeft) {
            setRightSidebarOpen(false);
          }

          return nextLeft;
        });
      },
      [isMobile],
    );

  const setRightSidebarOpenWithMobileRules: Dispatch<SetStateAction<boolean>> =
    useCallback(
      (value) => {
        setRightSidebarOpen((prevRight) => {
          const nextRight =
            typeof value === "function" ? value(prevRight) : value;

          if (isMobile && nextRight) {
            setLeftSidebarOpen(false);
          }

          return nextRight;
        });
      },
      [isMobile],
    );

  return {
    leftSidebarOpen,
    setLeftSidebarOpen: setLeftSidebarOpenWithMobileRules,
    rightSidebarOpen,
    setRightSidebarOpen: setRightSidebarOpenWithMobileRules,
  };
};
