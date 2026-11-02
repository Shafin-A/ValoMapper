import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReplaySettingsMenu } from "@/components/replay/replay-settings-menu";

describe("ReplaySettingsMenu", () => {
  it("rotates the gear when opened and toggles replay display options", async () => {
    const user = userEvent.setup();
    const onHideDeadAgentsChange = jest.fn();
    const onHideAgentWeaponsChange = jest.fn();
    const onHideWeaponHitsChange = jest.fn();
    const onShowVisionConesChange = jest.fn();
    const onShowUtilitiesChange = jest.fn();
    const onStartAtBarrierDropChange = jest.fn();

    render(
      <ReplaySettingsMenu
        hideDeadAgents={false}
        onHideDeadAgentsChange={onHideDeadAgentsChange}
        hideAgentWeapons={false}
        onHideAgentWeaponsChange={onHideAgentWeaponsChange}
        hideWeaponHits={false}
        onHideWeaponHitsChange={onHideWeaponHitsChange}
        showVisionCones
        onShowVisionConesChange={onShowVisionConesChange}
        showUtilities
        onShowUtilitiesChange={onShowUtilitiesChange}
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

    const abilitiesToggle = screen.getByRole("switch", {
      name: "Hide abilities",
    });
    await user.click(abilitiesToggle);
    expect(onShowUtilitiesChange).toHaveBeenCalledWith(false);
    expect(screen.queryByLabelText("Utility legend")).not.toBeInTheDocument();

    const weaponsToggle = screen.getByRole("switch", {
      name: "Hide agent weapons",
    });
    await user.click(weaponsToggle);

    expect(onHideAgentWeaponsChange).toHaveBeenCalledWith(true);

    const hitsToggle = screen.getByRole("switch", {
      name: "Hide weapon hits",
    });
    await user.click(hitsToggle);

    expect(onHideWeaponHitsChange).toHaveBeenCalledWith(true);

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
