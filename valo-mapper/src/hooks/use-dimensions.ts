import { useEffect, useState } from "react";

export const useDimensions = (ref: React.RefObject<HTMLElement | null>) => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (ref.current?.offsetHeight && ref.current?.offsetWidth) {
        setDimensions({
          width: ref.current.offsetWidth,
          height: ref.current.offsetHeight,
        });
      }
    };

    updateDimensions();

    if (typeof ResizeObserver !== "undefined" && ref.current) {
      const resizeObserver = new ResizeObserver(() => updateDimensions());
      resizeObserver.observe(ref.current);

      return () => resizeObserver.disconnect();
    } else {
      window.addEventListener("resize", updateDimensions);
      return () => window.removeEventListener("resize", updateDimensions);
    }
  }, [ref]);

  return dimensions;
};
