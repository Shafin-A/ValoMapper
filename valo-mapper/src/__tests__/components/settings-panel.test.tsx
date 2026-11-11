import { fireEvent, render, screen } from "@testing-library/react";
import { SettingsPanel } from "@/components/agents-sidebar/settings-panel";
import { defaultIconSettings } from "@/contexts/settings-context";

describe("SettingsPanel color picker", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("updates the ally color from a preset swatch", () => {
    const onSettingsChange = jest.fn();

    render(
      <SettingsPanel
        settings={defaultIconSettings}
        onSettingsChange={onSettingsChange}
        onReset={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ally color" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Ally color #FF4655" }),
    );

    jest.advanceTimersByTime(20);

    expect(onSettingsChange).toHaveBeenCalledWith({ allyColor: "#FF4655" });
  });
});
