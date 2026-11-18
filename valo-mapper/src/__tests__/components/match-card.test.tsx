import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MatchCard } from "@/components/matches/match-card";
import { MatchPreview } from "@/lib/types";

const createMatch = (overrides: Partial<MatchPreview> = {}): MatchPreview => ({
  matchId: "match-1",
  playedAt: 1,
  queueLabel: "Competitive",
  mapId: "ascent",
  mapName: "Ascent",
  result: "Win",
  teamScore: 13,
  enemyScore: 9,
  kills: 21,
  deaths: 14,
  assists: 6,
  personalScore: 5321,
  agentId: "jett-id",
  agentName: "Jett",
  ...overrides,
});

describe("MatchCard", () => {
  it("renders the score line and KDA", () => {
    render(<MatchCard match={createMatch()} />);

    expect(screen.getByText("Victory")).toBeInTheDocument();
    expect(screen.getByText("13")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(screen.getByText("21 / 14 / 6")).toBeInTheDocument();
    expect(screen.getByText("5321")).toBeInTheDocument();
  });

  it("labels non-win results as defeats", () => {
    render(<MatchCard match={createMatch({ result: "Loss" })} />);

    expect(screen.getByText("Defeat")).toBeInTheDocument();
    expect(screen.queryByText("Victory")).not.toBeInTheDocument();
  });

  it("uses map and agent artwork", () => {
    const { container } = render(
      <MatchCard match={createMatch({ mapName: "Split", agentName: "KAY/O" })} />,
    );

    expect(
      container.querySelector('[data-src="/maps/listviewicons/split.webp"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-src="/agents/kayo/kayo.png"]'),
    ).not.toBeNull();
    expect(screen.getByRole("img", { name: "Split" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "KAY/O" })).toBeInTheDocument();
  });

  it("falls back to a generic agent label", () => {
    render(<MatchCard match={createMatch({ agentName: "" })} />);

    expect(screen.getByRole("img", { name: "Agent" })).toBeInTheDocument();
  });

  it("forwards button props and click handlers", async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();

    render(
      <MatchCard
        match={createMatch()}
        aria-label="Open match"
        className="custom-card"
        onClick={onClick}
      />,
    );

    const card = screen.getByRole("button", { name: "Open match" });

    expect(card).toHaveClass("custom-card");
    await user.click(card);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
