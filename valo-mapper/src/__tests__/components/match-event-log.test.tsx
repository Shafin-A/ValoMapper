import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MatchEventLog } from "@/components/matches/match-event-log";
import { MatchPlayers, MatchRoundEvent } from "@/lib/matches";

const players: MatchPlayers = [
  {
    puuid: "blue-1",
    gameName: "BlueOne",
    tagLine: "EUW",
    teamId: "Blue",
    characterId: "astra-id",
    characterName: "Astra",
  },
  {
    puuid: "red-1",
    gameName: "RedOne",
    tagLine: "NA",
    teamId: "Red",
    characterId: "jett-id",
    characterName: "Jett",
  },
];

const events: MatchRoundEvent[] = [
  {
    eventType: "kill",
    timeSinceRoundStartMillis: 65_000,
    killerPuuid: "blue-1",
    victimPuuid: "red-1",
    damageType: "Weapon",
    damageItem: "Vandal",
  },
  {
    eventType: "spike_planted",
    timeSinceRoundStartMillis: 12_000,
    planterPuuid: "blue-1",
  },
  {
    eventType: "spike_defused",
    timeSinceRoundStartMillis: 30_000,
    defuserPuuid: "red-1",
  },
  {
    eventType: "spike_exploded",
    timeSinceRoundStartMillis: 40_500,
  },
];

describe("MatchEventLog", () => {
  it("renders the heading and formatted event times", () => {
    render(<MatchEventLog events={events} players={players} />);

    expect(screen.getByText("Event Log")).toBeInTheDocument();
    expect(screen.getByText("1:05")).toBeInTheDocument();
    expect(screen.getByText("0:12")).toBeInTheDocument();
    expect(screen.getByText("0:30")).toBeInTheDocument();
    expect(screen.getByText("0:40")).toBeInTheDocument();
  });

  it("labels spike events", () => {
    render(<MatchEventLog events={events} players={players} />);

    expect(screen.getByText("Planted")).toBeInTheDocument();
    expect(screen.getByText("Defused")).toBeInTheDocument();
    expect(screen.getByText("Detonated")).toBeInTheDocument();
  });

  it("renders killer and victim agent artwork for kills", () => {
    const { container } = render(
      <MatchEventLog events={[events[0]]} players={players} />,
    );

    expect(screen.getByRole("img", { name: "Killer" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Victim" })).toBeInTheDocument();
    expect(
      container.querySelector('[data-src="/weapons/VANDAL_killstream.png"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-src="/agents/astra/astra.png"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-src="/agents/jett/jett.png"]'),
    ).not.toBeNull();
  });

  it("renders spike artwork for plant and detonation events", () => {
    const { container } = render(
      <MatchEventLog events={[events[1], events[3]]} players={players} />,
    );

    expect(
      container.querySelectorAll('[data-src="/tools/spike.webp"]'),
    ).toHaveLength(2);
    expect(
      container.querySelector('[data-src="/matchOutcomes/explosionwin1.png"]'),
    ).not.toBeNull();
  });

  it("renders defuse artwork", () => {
    const { container } = render(
      <MatchEventLog events={[events[2]]} players={players} />,
    );

    expect(
      container.querySelector('[data-src="/matchOutcomes/defuse.png"]'),
    ).not.toBeNull();
  });

  it("marks rows as buttons and reports the selected event", async () => {
    const user = userEvent.setup();
    const onSelectEvent = jest.fn();

    render(
      <MatchEventLog
        events={events}
        players={players}
        onSelectEvent={onSelectEvent}
      />,
    );

    const rows = screen.getAllByRole("button");

    expect(rows).toHaveLength(events.length);

    await user.click(rows[1]);
    expect(onSelectEvent).toHaveBeenLastCalledWith(1);

    await user.click(screen.getByText("1:05"));
    expect(onSelectEvent).toHaveBeenLastCalledWith(0);
  });

  it("supports keyboard selection with Enter and Space", async () => {
    const user = userEvent.setup();
    const onSelectEvent = jest.fn();

    render(
      <MatchEventLog
        events={events}
        players={players}
        onSelectEvent={onSelectEvent}
      />,
    );

    const rows = screen.getAllByRole("button");

    rows[2].focus();
    await user.keyboard("{Enter}");
    expect(onSelectEvent).toHaveBeenLastCalledWith(2);

    await user.keyboard(" ");
    expect(onSelectEvent).toHaveBeenLastCalledWith(2);
  });

  it("does not make rows interactive without a selection handler", () => {
    render(<MatchEventLog events={events} players={players} />);

    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("renders no event rows for an empty log", () => {
    render(<MatchEventLog events={[]} players={players} />);

    expect(screen.getByText("Event Log")).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  it("highlights the selected row", () => {
    const { container } = render(
      <MatchEventLog
        events={events}
        players={players}
        onSelectEvent={jest.fn()}
        selectedEventIndex={1}
      />,
    );

    const rows = within(container).getAllByRole("button");

    expect(rows[1]).toHaveClass("ring-2");
    expect(rows[0]).not.toHaveClass("ring-2");
  });
});
