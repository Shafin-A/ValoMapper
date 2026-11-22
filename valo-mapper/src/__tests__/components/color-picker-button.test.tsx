import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ColorPickerButton } from "@/components/shared/color-picker-button";

describe("ColorPickerButton", () => {
  it("shows the current color on the trigger", () => {
    const { container } = render(
      <ColorPickerButton
        label="Draw color"
        value="#FF4655"
        onChange={jest.fn()}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Draw color" });

    expect(trigger).toHaveStyle({ backgroundColor: "#FF4655" });
    expect(container.querySelectorAll("button[aria-pressed]")).toHaveLength(0);
  });

  it("marks the matching preset as selected", async () => {
    const user = userEvent.setup();

    render(
      <ColorPickerButton
        label="Draw color"
        value="#ff4655"
        onChange={jest.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Draw color" }));

    expect(
      screen.getByRole("button", { name: "Draw color #FF4655" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "Draw color #42EEC7" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("selects a preset color and closes the popover", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(
      <ColorPickerButton label="Draw color" value="#ffffff" onChange={onChange} />,
    );

    const trigger = screen.getByRole("button", { name: "Draw color" });
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Draw color #18636c" }));

    expect(onChange).toHaveBeenCalledWith("#18636c");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("emits custom colors from the native color input", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(
      <ColorPickerButton label="Draw color" value="#ffffff" onChange={onChange} />,
    );

    await user.click(screen.getByRole("button", { name: "Draw color" }));

    fireEvent.change(
      screen.getByLabelText("Draw color Custom color"),
      { target: { value: "#123456" } },
    );

    expect(onChange).toHaveBeenCalledWith("#123456");
  });

  it("keeps the popover open while picking a custom color", async () => {
    const user = userEvent.setup();

    render(
      <ColorPickerButton label="Draw color" value="#ffffff" onChange={jest.fn()} />,
    );

    const trigger = screen.getByRole("button", { name: "Draw color" });
    await user.click(trigger);

    fireEvent.change(
      screen.getByLabelText("Draw color Custom color"),
      { target: { value: "#abcdef" } },
    );

    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });
});
