import { useEffect, useState } from "react";

type VisualViewportSize = {
  top: number;
  height: number;
};

const getVisualViewport = (): VisualViewportSize => {
  if (typeof window === "undefined") {
    return { top: 0, height: 0 };
  }

  const viewport = window.visualViewport;
  return viewport
    ? { top: viewport.offsetTop, height: viewport.height }
    : { top: 0, height: window.innerHeight };
};

export const useVisualViewport = () => {
  const [size, setSize] = useState<VisualViewportSize>(getVisualViewport);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) {
      const update = () =>
        setSize({ top: 0, height: window.innerHeight });

      update();
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }

    const update = () =>
      setSize({ top: viewport.offsetTop, height: viewport.height });

    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);

  return size;
};
