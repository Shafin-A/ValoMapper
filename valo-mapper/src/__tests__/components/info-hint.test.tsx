import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InfoHint } from "@/components/shared/info-hint";
import { useIsMobile } from "@/hooks/use-mobile";

jest.mock("@/hooks/use-mobile");

const mockUseIsMobile = jest.mocked(useIsMobile);

describe("InfoHint", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders an accessible trigger", () => {
    mockUseIsMobile.mockReturnValue(false);

    render(<InfoHint label="Line mode help">Erased lines are removed.</InfoHint>);

    expect(
      screen.getByRole("button", { name: "Line mode help" }),
    ).toBeInTheDocument();
  });

  it("opens a popover on mobile", async () => {
    const user = userEvent.setup();
    mockUseIsMobile.mockReturnValue(true);

    render(<InfoHint label="Line mode help">Erased lines are removed.</InfoHint>);

    expect(
      screen.queryByText("Erased lines are removed."),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Line mode help" }));

    expect(screen.getByText("Erased lines are removed.")).toBeInTheDocument();
  });

  it("shows a tooltip on desktop hover", async () => {
    const user = userEvent.setup();
    mockUseIsMobile.mockReturnValue(false);

    render(<InfoHint label="Line mode help">Erased lines are removed.</InfoHint>);

    await user.hover(screen.getByRole("button", { name: "Line mode help" }));

    expect(
      (await screen.findAllByText("Erased lines are removed.")).length,
    ).toBeGreaterThan(0);
  });

  it("applies custom trigger and content classes", async () => {
    const user = userEvent.setup();
    mockUseIsMobile.mockReturnValue(true);

    render(
      <InfoHint
        label="Help"
        className="custom-trigger"
        contentClassName="custom-content"
      >
        Hint body
      </InfoHint>,
    );

    expect(screen.getByRole("button", { name: "Help" })).toHaveClass(
      "custom-trigger",
    );

    await user.click(screen.getByRole("button", { name: "Help" }));

    expect(screen.getByText("Hint body")).toHaveClass("custom-content");
  });
});
