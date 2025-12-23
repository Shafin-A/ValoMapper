import { PhaseState } from "@/lib/types";
import Konva from "konva";
import { useCallback, useRef } from "react";

export const usePhaseTransitions = () => {
  const nodeRefs = useRef<Map<string, Konva.Node>>(new Map());
  const isTransitioning = useRef(false);
  const transitionDuration = useRef(200);

  const registerNode = useCallback((id: string, node: Konva.Node) => {
    nodeRefs.current.set(id, node);
  }, []);

  const unregisterNode = useCallback((id: string) => {
    nodeRefs.current.delete(id);
  }, []);

  const transitionToPhase = useCallback(
    (fromPhase: PhaseState, toPhase: PhaseState, duration: number = 200) => {
      transitionDuration.current = duration;

      return new Promise<void>((resolve) => {
        toPhase.agentsOnCanvas.forEach((toAgent) => {
          const node = nodeRefs.current.get(toAgent.id);
          if (!node) return;

          const tween = new Konva.Tween({
            node: node,
            duration: duration / 1000,
            easing: Konva.Easings.EaseInOut,
            x: toAgent.x,
            y: toAgent.y,
            opacity: 1,
          });
          tween.play();
        });

        fromPhase.agentsOnCanvas.forEach((fromAgent) => {
          const existsInToPhase = toPhase.agentsOnCanvas.some(
            (a) => a.id === fromAgent.id
          );

          if (!existsInToPhase) {
            const node = nodeRefs.current.get(fromAgent.id);
            if (!node) return;

            const tween = new Konva.Tween({
              node: node,
              duration: duration / 1000,
              easing: Konva.Easings.EaseInOut,
              opacity: 0,
              onFinish: () => {
                node.destroy();
                nodeRefs.current.delete(fromAgent.id);
              },
            });
            tween.play();
          }
        });

        setTimeout(() => {
          resolve();
        }, duration);
      });
    },
    []
  );

  return {
    registerNode,
    unregisterNode,
    transitionToPhase,
    isTransitioning,
  };
};
