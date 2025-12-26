import { render, screen } from "@testing-library/react";
import { Shortcuts } from "@/components/help/shortcuts";

describe("Shortcuts", () => {
  it("should render all shortcut categories", () => {
    render(<Shortcuts />);

    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByText("Draw Tool")).toBeInTheDocument();
    expect(screen.getByText("Eraser Tool")).toBeInTheDocument();
    expect(screen.getByText("Phase Navigation")).toBeInTheDocument();
  });

  it("should render general shortcuts", () => {
    render(<Shortcuts />);

    expect(screen.getByText("Undo")).toBeInTheDocument();
    expect(screen.getByText("Redo")).toBeInTheDocument();
    expect(screen.getByText("Delete Hovered Element")).toBeInTheDocument();
    expect(screen.getByText("Recenter Canvas")).toBeInTheDocument();
  });

  it("should render draw tool shortcuts", () => {
    render(<Shortcuts />);

    expect(screen.getByText("Toggle Draw Tool On/Off")).toBeInTheDocument();
    expect(screen.getByText("Toggle Dashed/Solid Lines")).toBeInTheDocument();
    expect(screen.getByText("Toggle Arrow Head")).toBeInTheDocument();
  });

  it("should render eraser tool shortcuts", () => {
    render(<Shortcuts />);

    expect(screen.getByText("Toggle Eraser Tool On/Off")).toBeInTheDocument();
    expect(
      screen.getByText("Toggle Erase Entire Line On/Off")
    ).toBeInTheDocument();
  });

  it("should render phase navigation shortcuts", () => {
    render(<Shortcuts />);

    expect(
      screen.getByText("Previous Phase (if not at first phase)")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Next Phase (if not at last phase)")
    ).toBeInTheDocument();
  });

  it("should display keyboard combinations correctly", () => {
    render(<Shortcuts />);

    const undoDescription = screen.getByText("Undo");
    expect(undoDescription).toBeInTheDocument();

    const kbdElements = screen.getAllByText(/Ctrl|Cmd|Shift|Z|Q|W|E|R|A|D/);
    expect(kbdElements.length).toBeGreaterThan(0);
  });

  it("should render all shortcuts in correct structure", () => {
    const { container } = render(<Shortcuts />);

    const categoryHeaders = container.querySelectorAll("h3");
    expect(categoryHeaders).toHaveLength(4);

    const shortcutItems = container.querySelectorAll(
      ".flex.items-start.justify-between"
    );
    expect(shortcutItems.length).toBeGreaterThan(0);
  });
});
