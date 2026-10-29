import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReplaySettingsMenu } from "@/components/replay/replay-settings-menu";

describe("ReplaySettingsMenu", () => {
  it("rotates the gear when opened and toggles replay display options", async () => {
    const user = userEvent.setup();
    const onHideDeadAgentsChange = jest.fn();
    const onShowVisionConesChange = jest.fn();
    const onStartAtBarrierDropChange = jest.fn();

    render(
      <ReplaySettingsMenu
        hideDeadAgents={false}
        onHideDeadAgentsChange={onHideDeadAgentsChange}
        showVisionCones
        onShowVisionConesChange={onShowVisionConesChange}
        startAtBarrierDrop
        onStartAtBarrierDropChange={onStartAtBarrierDropChange}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Replay settings" });
    expect(trigger.querySelector("svg")).not.toHaveClass("rotate-90");

    await user.click(trigger);

    expect(trigger.querySelector("svg")).toHaveClass("rotate-90");
    const visionToggle = await screen.findByRole("switch", {
      name: "Hide agent vision",
    });
    await user.click(visionToggle);
    expect(onShowVisionConesChange).toHaveBeenCalledWith(false);

    const deadToggle = screen.getByRole("switch", {
      name: "Hide dead agents",
    });
    await user.click(deadToggle);

    expect(onHideDeadAgentsChange).toHaveBeenCalledWith(true);

    const barrierDropToggle = screen.getByRole("switch", {
      name: "Start at barrier drop",
    });
    await user.click(barrierDropToggle);

    expect(onStartAtBarrierDropChange).toHaveBeenCalledWith(false);
  });
});
