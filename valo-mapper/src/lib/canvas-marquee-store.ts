import type { CanvasRect } from "@/lib/canvas-selection";

type Listener = () => void;

let snapshot: CanvasRect | null = null;
const listeners = new Set<Listener>();

const isSameRect = (left: CanvasRect | null, right: CanvasRect | null) => {
  if (left === right) return true;
  if (!left || !right) return false;

  return (
    left.x === right.x &&
    left.y === right.y &&
    left.width === right.width &&
    left.height === right.height
  );
};

export const canvasMarqueeStore = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot() {
    return snapshot;
  },
  getServerSnapshot() {
    return null;
  },
  set(next: CanvasRect | null) {
    if (isSameRect(snapshot, next)) return;
    snapshot = next;
    listeners.forEach((listener) => listener());
  },
};
