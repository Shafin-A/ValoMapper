import { useEffect, useState } from "react";

const COARSE_POINTER_QUERY = "(any-pointer: coarse)";

export const useHasCoarsePointer = () => {
  const [hasCoarsePointer, setHasCoarsePointer] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(COARSE_POINTER_QUERY);
    const update = () => setHasCoarsePointer(mediaQuery.matches);

    update();
    mediaQuery.addEventListener("change", update);

    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return hasCoarsePointer;
};
