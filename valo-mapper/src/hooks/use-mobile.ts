import { useEffect, useState } from "react";
import {
  MOBILE_MEDIA_QUERY,
  isMobileLayout,
} from "@/lib/mobile-layout";

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_MEDIA_QUERY);
    const onChange = () => {
      setIsMobile(isMobileLayout());
    };
    mql.addEventListener("change", onChange);
    window.addEventListener("orientationchange", onChange);
    window.addEventListener("resize", onChange);
    setIsMobile(isMobileLayout());
    return () => {
      mql.removeEventListener("change", onChange);
      window.removeEventListener("orientationchange", onChange);
      window.removeEventListener("resize", onChange);
    };
  }, []);

  return !!isMobile;
}
