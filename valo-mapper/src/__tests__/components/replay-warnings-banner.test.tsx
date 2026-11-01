import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  REPLAY_WARNINGS_DEBUG_KEY,
  ReplayWarningsBanner,
} from "@/components/replay/replay-warnings-banner";

describe("ReplayWarningsBanner", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("stays hidden unless the debug flag is enabled", () => {
    const { container } = render(
      <ReplayWarningsBanner warnings={["One warning."]} replayId="replay-a" />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when there are no warnings", () => {
    window.localStorage.setItem(REPLAY_WARNINGS_DEBUG_KEY, "true");

    const { container } = render(
      <ReplayWarningsBanner warnings={[]} replayId="replay-a" />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("shows the warning count and expands the list", async () => {
    window.localStorage.setItem(REPLAY_WARNINGS_DEBUG_KEY, "true");
    const user = userEvent.setup();
    render(
      <ReplayWarningsBanner
        warnings={["Missing movement samples.", "Spike custody was unresolved."]}
        replayId="replay-a"
      />,
    );

    expect(screen.getByText("Replay loaded with 2 warnings")).toBeInTheDocument();
    expect(
      screen.queryByText("Missing movement samples."),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show details" }));

    expect(screen.getByText("Missing movement samples.")).toBeInTheDocument();
    expect(
      screen.getByText("Spike custody was unresolved."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Hide details" }),
    ).toBeInTheDocument();
  });

  it("dismisses the banner per replay id", async () => {
    window.localStorage.setItem(REPLAY_WARNINGS_DEBUG_KEY, "true");
    const user = userEvent.setup();
    const { rerender } = render(
      <ReplayWarningsBanner warnings={["One warning."]} replayId="replay-a" />,
    );

    await user.click(
      screen.getByRole("button", { name: "Dismiss replay warnings" }),
    );
    expect(screen.queryByText("One warning.")).not.toBeInTheDocument();

    rerender(
      <ReplayWarningsBanner warnings={["One warning."]} replayId="replay-a" />,
    );
    expect(
      screen.queryByText("Replay loaded with 1 warning"),
    ).not.toBeInTheDocument();

    rerender(
      <ReplayWarningsBanner warnings={["One warning."]} replayId="replay-b" />,
    );
    expect(screen.getByText("Replay loaded with 1 warning")).toBeInTheDocument();
  });
});
