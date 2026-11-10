import { useEffect } from "react";

type Counters = Record<string, number>;

const counters: Counters = {};
const isEnabled = process.env.NODE_ENV === "development";

declare global {
  interface Window {
    __canvasPerf?: {
      reset: () => void;
      snapshot: () => Counters;
    };
  }
}

if (isEnabled && typeof window !== "undefined") {
  window.__canvasPerf = {
    reset: () => {
      for (const key of Object.keys(counters)) {
        delete counters[key];
      }
    },
    snapshot: () => ({ ...counters }),
  };
}

export const useCommitCount = (id: string) => {
  useEffect(() => {
    if (!isEnabled) return;
    counters[id] = (counters[id] ?? 0) + 1;
  });
};
