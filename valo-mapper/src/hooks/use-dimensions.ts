import { useEffect, useState, useRef } from "react";

export const useDimensions = (ref: React.RefObject<HTMLElement | null>) => {
  const [dimensions, setDimensions] = useState({ width: 5, height: 5 });
  const [previousDimensions, setPreviousDimensions] = useState({
    width: 5,
    height: 5,
  });

  const dimensionsRef = useRef(dimensions);
  dimensionsRef.current = dimensions;

  useEffect(() => {
    const updateDimensions = () => {
      if (ref.current?.offsetHeight && ref.current?.offsetWidth) {
        const newDimensions = {
          width: ref.current.offsetWidth,
          height: ref.current.offsetHeight,
        };

        const current = dimensionsRef.current;
        if (
          newDimensions.width !== current.width ||
          newDimensions.height !== current.height
        ) {
          setPreviousDimensions(current);
          setDimensions(newDimensions);
        }
      }
    };

    updateDimensions();

    if (typeof ResizeObserver !== "undefined" && ref.current) {
      const resizeObserver = new ResizeObserver(updateDimensions);
      resizeObserver.observe(ref.current);

      return () => resizeObserver.disconnect();
    } else {
      window.addEventListener("resize", updateDimensions);
      return () => window.removeEventListener("resize", updateDimensions);
    }
  }, [ref]);

  return { dimensions, previousDimensions };
};
