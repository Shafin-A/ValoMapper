type Listener = () => void;

export type ReplayClock = {
  subscribe: (listener: Listener) => () => void;
  getTime: () => number;
  setTime: (timeMs: number) => void;
};

export const createReplayClock = (initialTimeMs = 0): ReplayClock => {
  let timeMs = initialTimeMs;
  const listeners = new Set<Listener>();

  return {
    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    getTime: () => timeMs,
    setTime(nextTimeMs) {
      if (nextTimeMs === timeMs) {
        return;
      }

      timeMs = nextTimeMs;
      listeners.forEach((listener) => listener());
    },
  };
};
