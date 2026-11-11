let suppressItemTap = false;

export const markCanvasItemTapSuppressed = () => {
  suppressItemTap = true;
};

export const clearCanvasItemTapSuppression = () => {
  suppressItemTap = false;
};

export const shouldSuppressCanvasItemTap = () => suppressItemTap;
