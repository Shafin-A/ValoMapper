import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;
const MOBILE_MEDIA_QUERY = `(max-width: ${
  MOBILE_BREAKPOINT - 1
}px), ((max-width: ${TABLET_BREAKPOINT - 1}px) and (pointer: coarse))`;

const isMobileViewport = () => {
  if (typeof window === "undefined") return false;

  if (window.innerWidth < MOBILE_BREAKPOINT) return true;
  if (window.innerWidth >= TABLET_BREAKPOINT) return false;

  // Tablets and large touch devices should use the mobile (sheet) layout
  // instead of the desktop two-sidebar layout.
  return window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
};

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_MEDIA_QUERY);
    const onChange = () => {
      setIsMobile(isMobileViewport());
    };
    mql.addEventListener("change", onChange);
    window.addEventListener("orientationchange", onChange);
    window.addEventListener("resize", onChange);
    setIsMobile(isMobileViewport());
    return () => {
      mql.removeEventListener("change", onChange);
      window.removeEventListener("orientationchange", onChange);
      window.removeEventListener("resize", onChange);
    };
  }, []);

  return !!isMobile;
}
