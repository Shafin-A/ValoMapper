import { render } from "@testing-library/react";
import { PenTapToClick } from "@/components/providers/pen-tap-to-click";

const dispatchPointer = (
  target: Element,
  type: string,
  {
    pointerType = "pen",
    clientX = 10,
    clientY = 10,
  }: { pointerType?: string; clientX?: number; clientY?: number } = {},
) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, {
    pointerType,
    pointerId: 1,
    clientX,
    clientY,
    button: 0,
  });
  target.dispatchEvent(event);
};

describe("PenTapToClick", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const createButton = () => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Tap";
    document.body.appendChild(button);
    return button;
  };

  it("synthesizes a click for a stationary pen tap", () => {
    const button = createButton();
    const onClick = jest.fn();
    button.addEventListener("click", onClick);

    render(<PenTapToClick />);

    dispatchPointer(button, "pointerdown");
    dispatchPointer(button, "pointerup");
    jest.runOnlyPendingTimers();

    expect(onClick).toHaveBeenCalledTimes(1);

    button.remove();
  });

  it("dispatches mousedown for controls that activate on mouse-down", () => {
    const button = createButton();
    const onMouseDown = jest.fn();
    button.addEventListener("mousedown", onMouseDown);

    render(<PenTapToClick />);

    dispatchPointer(button, "pointerdown");
    dispatchPointer(button, "pointerup");

    expect(onMouseDown).toHaveBeenCalledTimes(1);

    button.remove();
  });

  it("does not synthesize a click after pen movement", () => {
    const button = createButton();
    const onClick = jest.fn();
    button.addEventListener("click", onClick);

    render(<PenTapToClick />);

    dispatchPointer(button, "pointerdown", { clientX: 10, clientY: 10 });
    dispatchPointer(button, "pointermove", { clientX: 80, clientY: 80 });
    dispatchPointer(button, "pointerup", { clientX: 80, clientY: 80 });
    jest.runOnlyPendingTimers();

    expect(onClick).not.toHaveBeenCalled();

    button.remove();
  });

  it("does not synthesize a click for finger taps", () => {
    const button = createButton();
    const onClick = jest.fn();
    button.addEventListener("click", onClick);

    render(<PenTapToClick />);

    dispatchPointer(button, "pointerdown", { pointerType: "touch" });
    dispatchPointer(button, "pointerup", { pointerType: "touch" });
    jest.runOnlyPendingTimers();

    expect(onClick).not.toHaveBeenCalled();

    button.remove();
  });
});
