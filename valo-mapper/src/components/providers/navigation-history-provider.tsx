"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const PreviousPathnameContext = createContext<string | null>(null);

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export const NavigationHistoryProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const pathname = usePathname();
  const lastPathnameRef = useRef<string | null>(null);
  const [previousPathname, setPreviousPathname] = useState<string | null>(null);

  useIsomorphicLayoutEffect(() => {
    if (
      lastPathnameRef.current !== null &&
      lastPathnameRef.current !== pathname
    ) {
      setPreviousPathname(lastPathnameRef.current);
    }

    lastPathnameRef.current = pathname;
  }, [pathname]);

  return (
    <PreviousPathnameContext.Provider value={previousPathname}>
      {children}
    </PreviousPathnameContext.Provider>
  );
};

export const usePreviousPathname = () => useContext(PreviousPathnameContext);
