import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EraserSettings } from "@/components/tools-sidebar/eraser-settings";
import { useSettings } from "@/contexts/settings-context";

jest.mock("@/contexts/settings-context");

const mockUseSettings = jest.mocked(useSettings);

const renderSettings = (
  eraserSettings: { size: number; mode: "pixel" | "line" },
  updateEraserSettings = jest.fn(),
) => {
  mockUseSettings.mockReturnValue({
    eraserSettings,
    updateEraserSettings,
  } as unknown as ReturnType<typeof useSettings>);

  render(<EraserSettings />);

  return { updateEraserSettings };
};

describe("EraserSettings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows the current eraser size", () => {
    renderSettings({ size: 4, mode: "pixel" });

    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "4");
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuemax", "10");
  });

  it("updates the eraser size from the slider", () => {
    const { updateEraserSettings } = renderSettings({
      size: 4,
      mode: "pixel",
    });

    fireEvent.keyDown(screen.getByRole("slider"), { key: "ArrowRight" });

    expect(updateEraserSettings).toHaveBeenCalledWith({ size: 5 });
  });

  it("reflects pixel mode with an unchecked switch", () => {
    renderSettings({ size: 2, mode: "pixel" });

    expect(screen.getByRole("switch")).toHaveAttribute(
      "data-state",
      "unchecked",
    );
  });

  it("reflects line mode with a checked switch", () => {
    renderSettings({ size: 2, mode: "line" });

    expect(screen.getByRole("switch")).toHaveAttribute("data-state", "checked");
  });

  it("switches to line mode", async () => {
    const user = userEvent.setup();
    const { updateEraserSettings } = renderSettings({
      size: 2,
      mode: "pixel",
    });

    await user.click(screen.getByRole("switch"));

    expect(updateEraserSettings).toHaveBeenCalledWith({ mode: "line" });
  });

  it("switches back to pixel mode", async () => {
    const user = userEvent.setup();
    const { updateEraserSettings } = renderSettings({
      size: 2,
      mode: "line",
    });

    await user.click(screen.getByRole("switch"));

    expect(updateEraserSettings).toHaveBeenCalledWith({ mode: "pixel" });
  });

  it("explains how line mode treats partial erases", () => {
    renderSettings({ size: 2, mode: "pixel" });

    expect(
      screen.getByText(/partially erased\/disconnected lines/i),
    ).toBeInTheDocument();
  });
});
