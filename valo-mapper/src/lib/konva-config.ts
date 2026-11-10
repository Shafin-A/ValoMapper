import Konva from "konva";

if (typeof window !== "undefined") {
  Konva.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
}
