const loadedImageSources = new Set<string>();
const loadingImagePromises = new Map<string, Promise<void>>();

const markImageAsLoaded = (src: string) => {
  loadedImageSources.add(src);
  loadingImagePromises.delete(src);
};

const loadImage = (src: string): Promise<void> => {
  if (!src) return Promise.resolve();
  if (loadedImageSources.has(src)) return Promise.resolve();

  const existingPromise = loadingImagePromises.get(src);
  if (existingPromise) return existingPromise;

  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  const imageLoadPromise = new Promise<void>((resolve) => {
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      markImageAsLoaded(src);
      resolve();
    };

    const image = new Image();
    image.onload = finish;
    image.onerror = finish;
    image.src = src;

    if (image.complete) finish();
  });

  loadingImagePromises.set(src, imageLoadPromise);
  return imageLoadPromise;
};

export const preloadImages = async (sources: string[]): Promise<void> => {
  const uniqueSources = [...new Set(sources.filter(Boolean))];
  await Promise.all(uniqueSources.map(loadImage));
};

export const preloadImagesWithTimeout = async (
  sources: string[],
  timeoutMs?: number,
): Promise<void> => {
  if (!timeoutMs) {
    await preloadImages(sources);
    return;
  }

  await Promise.race([
    preloadImages(sources),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
};
