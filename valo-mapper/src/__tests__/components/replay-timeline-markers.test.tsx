import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReplayTimeline } from "@/components/replay/replay-timeline";
import type { ReplayRound } from "@/lib/replay/types";
import type { MatchPlayerSummary } from "@/lib/types";

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
  it("renders a tooltip for the barrier drop", async () => {
    const user = userEvent.setup();
    render(
      <ReplayTimeline
        round={round}
        players={[]}
        currentTimeMs={0}
        onSeek={jest.fn()}
      />,
    );

    const marker = screen.getByLabelText("0:05 — Barrier drop");
    expect(marker).toHaveClass("bg-white/70");

    await user.hover(marker);

    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip).toHaveTextContent("0:05 — Barrier drop");
    expect(tooltip.querySelector("svg")).toBeNull();
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

    expect(screen.getByLabelText("0:10 — Spike planted")).toHaveClass(
      "bg-amber-300",
    );
    expect(screen.getByLabelText("0:20 — Spike defused")).toHaveClass(
      "bg-cyan-300",
    );
    expect(screen.getByLabelText("0:45 — Spike detonated")).toHaveClass(
      "bg-rose-400",
    );
  });

  it("shows the event log preview when hovering a marker", async () => {
    const user = userEvent.setup();
    const players: MatchPlayerSummary[] = [
      {
        puuid: "killer",
        gameName: "BlueOne",
        tagLine: "NA1",
        teamId: "Blue",
        characterId: "",
        characterName: "Chamber",
      },
      {
        puuid: "victim",
        gameName: "RedOne",
        tagLine: "NA1",
        teamId: "Red",
        characterId: "",
        characterName: "Reyna",
      },
    ];
    const killRound = {
      ...round,
      eventLog: [
        {
          eventType: "kill",
          timeSinceRoundStartMillis: 92_000,
          killerPuuid: "killer",
          victimPuuid: "victim",
        },
      ],
    } as unknown as ReplayRound;

    render(
      <ReplayTimeline
        round={killRound}
        players={players}
        currentTimeMs={0}
        onSeek={jest.fn()}
      />,
    );

    await user.hover(
      screen.getByLabelText("1:32 — Chamber killed Reyna"),
    );

    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip).toHaveTextContent("1:32");
    expect(tooltip.querySelector("svg")).toBeNull();
    expect(
      within(tooltip).getByRole("img", { name: "Killer" }),
    ).toBeInTheDocument();
    expect(
      within(tooltip).getByRole("img", { name: "Victim" }),
    ).toBeInTheDocument();
  });
});
