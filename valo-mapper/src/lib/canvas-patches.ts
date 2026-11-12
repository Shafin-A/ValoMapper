import type { CanvasPatchEntry, PhaseState } from "@/lib/types";

type EnqueueCanvasPatchEntry = (entry: CanvasPatchEntry) => void;

export const enqueueCanvasPhaseSnapshot = ({
  phase,
  phaseIndex,
  editedPhases,
  enqueue,
}: {
  phase: PhaseState;
  phaseIndex: number;
  editedPhases: Iterable<number>;
  enqueue: EnqueueCanvasPatchEntry;
}) => {
  phase.agentsOnCanvas.forEach((agent) =>
    enqueue({
      entity: "agent",
      action: "add",
      phaseIndex,
      id: agent.id,
      payload: agent,
    }),
  );

  phase.abilitiesOnCanvas.forEach((ability) =>
    enqueue({
      entity: "ability",
      action: "add",
      phaseIndex,
      id: ability.id,
      payload: ability,
    }),
  );

  phase.drawLines.forEach((line) =>
    enqueue({
      entity: "drawline",
      action: "add",
      phaseIndex,
      id: line.id,
      payload: line,
    }),
  );

  phase.connectingLines.forEach((line) =>
    enqueue({
      entity: "connectingline",
      action: "add",
      phaseIndex,
      id: line.id,
      payload: line,
    }),
  );

  phase.textsOnCanvas.forEach((text) =>
    enqueue({
      entity: "text",
      action: "add",
      phaseIndex,
      id: text.id,
      payload: text,
    }),
  );

  phase.imagesOnCanvas.forEach((image) =>
    enqueue({
      entity: "image",
      action: "add",
      phaseIndex,
      id: image.id,
      payload: image,
    }),
  );

  phase.toolIconsOnCanvas.forEach((icon) =>
    enqueue({
      entity: "toolicon",
      action: "add",
      phaseIndex,
      id: icon.id,
      payload: icon,
    }),
  );

  enqueue({
    entity: "edited_phases",
    action: "update",
    phaseIndex,
    payload: { editedPhases: [...Array.from(editedPhases), phaseIndex] },
  });
};
