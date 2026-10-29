import { render, screen } from "@testing-library/react";
import { ReplayTimeline } from "@/components/replay/replay-timeline";
import type { ReplayRound } from "@/lib/replay/types";

const round = {
  roundNumber: 1,
  durationMs: 60_000,
  buyEndTimeMs: 5_000,
  playerStats: [],
  frames: [],
  eventLog: [
    {
      eventType: "spike_planted",
      timeSinceRoundStartMillis: 10_000,
      planterPuuid: "planter",
    },
    {
      eventType: "spike_defused",
      timeSinceRoundStartMillis: 20_000,
      defuserPuuid: "defuser",
    },
    {
      eventType: "spike_exploded",
      timeSinceRoundStartMillis: 45_000,
    },
  ],
} as unknown as ReplayRound;

describe("ReplayTimeline spike markers", () => {
  it("renders a marker for the barrier drop", () => {
    render(
      <ReplayTimeline
        round={round}
        players={[]}
        currentTimeMs={0}
        onSeek={jest.fn()}
      />,
    );

    expect(screen.getByTitle("0:05 — Barrier drop")).toHaveClass(
      "bg-white/70",
    );
  });

  it("renders planted, defused and detonated markers with labels", () => {
    render(
      <ReplayTimeline
        round={round}
        players={[]}
        currentTimeMs={0}
        onSeek={jest.fn()}
      />,
    );

    expect(screen.getByTitle("0:10 — Spike planted")).toHaveClass(
      "bg-amber-300",
    );
    expect(screen.getByTitle("0:20 — Spike defused")).toHaveClass(
      "bg-cyan-300",
    );
    expect(screen.getByTitle("0:45 — Spike detonated")).toHaveClass(
      "bg-rose-400",
    );
  });
});
