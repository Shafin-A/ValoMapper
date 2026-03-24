import { fireEvent, render, waitFor } from "@testing-library/react";
import { TextEditor } from "@/components/canvas/text-editor";
import Konva from "konva";

jest.mock("react-konva-utils", () => ({
  Html: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("TextEditor collaboration safety", () => {
  const textNode = {
    position: () => ({ x: 10, y: 20 }),
    width: () => 100,
    height: () => 40,
    fontSize: () => 18,
    padding: () => 10,
    lineHeight: () => 1.2,
    fontFamily: () => "Arial",
    align: () => "left",
  } as unknown as Konva.Text;

  it("does not reset local text while remote text prop slices in", () => {
    const onClose = jest.fn();
    const onChange = jest.fn();

    const { getByRole, rerender } = render(
      <TextEditor
        textNode={textNode}
        text="start"
        onClose={onClose}
        onChange={onChange}
      />,
    );

    const textarea = getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea.value).toBe("start");

    fireEvent.change(textarea, { target: { value: "start typed" } });
    expect(textarea.value).toBe("start typed");

    // Simulate remote update while still editing text.
    rerender(
      <TextEditor
        textNode={textNode}
        text="remote"
        onClose={onClose}
        onChange={onChange}
      />,
    );

    expect(textarea.value).toBe("start typed");
  });

  it("applies latest typed value when clicking outside", async () => {
    jest.useFakeTimers();

    const onClose = jest.fn();
    const onChange = jest.fn();

    const { getByRole } = render(
      <TextEditor
        textNode={textNode}
        text="start"
        onClose={onClose}
        onChange={onChange}
      />,
    );

    const textarea = getByRole("textbox") as HTMLTextAreaElement;

    fireEvent.change(textarea, { target: { value: "typed text" } });

    // Allow the 100ms outside click guard timer to complete so the listener is installed.
    jest.advanceTimersByTime(100);

    fireEvent.click(document.body);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith("typed text");
      expect(onClose).toHaveBeenCalled();
    });

    jest.useRealTimers();
  });
});
