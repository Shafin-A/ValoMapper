import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useIsMobile } from "@/hooks/use-mobile";

export const useSidebarState = () => {
  const isMobile = useIsMobile();
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const wasMobileRef = useRef(isMobile);

  useEffect(() => {
    if (isMobile) {
      setLeftSidebarOpen(false);
      setRightSidebarOpen(false);
    } else if (wasMobileRef.current) {
      setLeftSidebarOpen(true);
      setRightSidebarOpen(true);
    }

    wasMobileRef.current = isMobile;
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
