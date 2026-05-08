import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DrawSettings } from "@/components/tools-sidebar/draw-settings";
import { useSettings } from "@/contexts/settings-context";

jest.mock("@/contexts/settings-context");

const mockUseSettings = jest.mocked(useSettings);

describe("DrawSettings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseDrawSettings = {
    size: 5,
    color: "#ffffff",
    isDashed: false,
    isArrowHead: false,
    shape: "freehand" as const,
    opacity: 1,
    traversalTime: null,
  };

  it("shows the currently selected traversal option", () => {
    mockUseSettings.mockReturnValue({
      drawSettings: {
        ...baseDrawSettings,
        traversalTime: "knife-walk",
      },
      updateDrawSettings: jest.fn(),
    } as unknown as ReturnType<typeof useSettings>);

    render(<DrawSettings />);

    expect(screen.getByLabelText("Traversal weapon Knife")).toHaveAttribute(
      "data-state",
      "on",
    );
    expect(
      screen.getByRole("switch", { name: "Traversal movement" }),
    ).toHaveAttribute("data-state", "unchecked");
    expect(screen.getByText("Walk")).toBeInTheDocument();
  });

  it("defaults to run when a weapon is selected", async () => {
    const updateDrawSettings = jest.fn();
    const user = userEvent.setup();

    mockUseSettings.mockReturnValue({
      drawSettings: {
        ...baseDrawSettings,
      },
      updateDrawSettings,
    } as unknown as ReturnType<typeof useSettings>);

    render(<DrawSettings />);

    await user.click(screen.getByLabelText("Traversal weapon Phantom/Vandal"));

    expect(updateDrawSettings).toHaveBeenCalledWith({
      traversalTime: "phantom-vandal-run",
    });
  });

  it("updates traversal time when the movement changes", async () => {
    const updateDrawSettings = jest.fn();
    const user = userEvent.setup();

    mockUseSettings.mockReturnValue({
      drawSettings: {
        ...baseDrawSettings,
        traversalTime: "knife-run",
      },
      updateDrawSettings,
    } as unknown as ReturnType<typeof useSettings>);

    render(<DrawSettings />);

    await user.click(
      screen.getByRole("switch", { name: "Traversal movement" }),
    );

    expect(updateDrawSettings).toHaveBeenCalledWith({
      traversalTime: "knife-walk",
    });
  });

  it("renders weapon icons and a movement switch", () => {
    mockUseSettings.mockReturnValue({
      drawSettings: baseDrawSettings,
      updateDrawSettings: jest.fn(),
    } as unknown as ReturnType<typeof useSettings>);

    const { container } = render(<DrawSettings />);

    expect(
      screen.getAllByRole("img", { name: "Knife" }).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByRole("img", { name: "Vandal" }).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Run")).toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: "Traversal movement" }),
    ).toBeDisabled();
    expect(
      container.querySelector(
        '[data-src="/weapons/2F59173C-4BED-B6C3-2191-DEA9B58BE9C7_killstream.png"]',
      ),
    ).not.toBeNull();
    expect(
      container.querySelector(
        '[data-src="/weapons/9C82E19D-4575-0200-1A81-3EACF00CF872_killstream.png"]',
      ),
    ).not.toBeNull();
  });
});
