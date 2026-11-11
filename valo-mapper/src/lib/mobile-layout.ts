const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

export const MOBILE_MEDIA_QUERY = `(max-width: ${
  MOBILE_BREAKPOINT - 1
}px), ((max-width: ${TABLET_BREAKPOINT - 1}px) and (pointer: coarse))`;

export const isMobileLayout = () => {
  if (typeof window === "undefined") return false;

  if (window.innerWidth < MOBILE_BREAKPOINT) return true;
  if (window.innerWidth >= TABLET_BREAKPOINT) return false;

  return window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
};
