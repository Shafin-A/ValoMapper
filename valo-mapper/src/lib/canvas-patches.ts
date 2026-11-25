import type { CanvasPatchEntry, DrawLine, PhaseState } from "@/lib/types";
import { MAX_DRAWLINE_POINTS } from "@/lib/consts/misc/consts";

type EnqueueCanvasPatchEntry = (entry: CanvasPatchEntry) => void;

export const splitDrawLineIntoChunks = (line: DrawLine): DrawLine[] => {
  if (line.points.length <= MAX_DRAWLINE_POINTS) {
    return [line];
  }

  const chunks: DrawLine[] = [];
  const totalChunks = Math.ceil(line.points.length / MAX_DRAWLINE_POINTS);

  for (let i = 0; i < totalChunks; i += 1) {
    const start = i * MAX_DRAWLINE_POINTS;
    const end = Math.min(start + MAX_DRAWLINE_POINTS, line.points.length);
    const segmentPoints = [...line.points.slice(start, end)];

    if (i > 0) {
      segmentPoints.unshift(line.points[start - 1]);
    }

    chunks.push({
      ...line,
      id: `${line.id}-chunk-${i}`,
      points: segmentPoints,
      parentId: line.id,
      chunkIndex: i,
      totalChunks,
    });
  }

  return chunks;
};

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
