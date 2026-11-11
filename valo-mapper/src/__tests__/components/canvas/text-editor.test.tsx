import { fireEvent, render, screen } from "@testing-library/react";
import { TextEditor } from "@/components/canvas/text-editor";
import { readSpansFromDom, spansToPlainText } from "@/lib/rich-text";
import type { TextSpan } from "@/lib/types";

const mockIsMobile = jest.fn(() => false);

jest.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => mockIsMobile(),
}));

jest.mock("react-konva-utils", () => ({
  Html: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const getEditor = (container: HTMLElement): HTMLDivElement => {
  const editor = container.querySelector<HTMLDivElement>(
    '[contenteditable="true"]',
  );
  if (!editor) throw new Error("editor not found");
  return editor;
};

const renderEditor = (
  overrides: Partial<{
    spans: TextSpan[];
    fontSize: number;
    width: number;
    height: number;
  }> = {},
) => {
  const onChange = jest.fn();
  const onClose = jest.fn();

  const result = render(
    <TextEditor
      spans={overrides.spans ?? [{ text: "start" }]}
      fontSize={overrides.fontSize ?? 18}
      width={overrides.width ?? 100}
      height={overrides.height ?? 40}
      onChange={onChange}
      onClose={onClose}
    />,
  );

  return { ...result, onChange, onClose, editor: getEditor(result.container) };
};

describe("TextEditor", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockIsMobile.mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    delete (document as unknown as { execCommand?: unknown }).execCommand;
  });

  it("does not reset local text while remote text prop slices in", () => {
    const { container, rerender, editor, onChange, onClose } = renderEditor();

    expect(editor.textContent).toBe("start");

    editor.innerHTML = "start typed";
    fireEvent.input(editor);
    expect(editor.textContent).toBe("start typed");

    // Simulate a remote update while still editing.
    rerender(
      <TextEditor
        spans={[{ text: "remote", bold: true }]}
        fontSize={18}
        width={100}
        height={40}
        onChange={onChange}
        onClose={onClose}
      />,
    );

    expect(getEditor(container).textContent).toBe("start typed");
  });

  it("applies latest typed value when clicking outside", () => {
    const { onChange, onClose, editor } = renderEditor();

    editor.innerHTML = "typed text";
    fireEvent.input(editor);

    // Allow the 100ms outside click guard timer to complete so the listener is installed.
    jest.advanceTimersByTime(100);

    fireEvent.pointerDown(document.body);

    expect(onChange).toHaveBeenCalledWith({
      spans: [{ text: "typed text" }],
      fontSize: 18,
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("does not commit when pressing Escape", () => {
    const { onChange, onClose, editor } = renderEditor();

    fireEvent.keyDown(editor, { key: "Escape" });

    expect(onChange).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("renders existing spans as styled HTML", () => {
    const { editor } = renderEditor({
      spans: [
        { text: "bold", bold: true },
        { text: " red", color: "#ff4655" },
      ],
    });

    const boldSpan = editor.querySelector("span[style*='font-weight']");
    expect(boldSpan?.textContent).toBe("bold");
    expect(editor.innerHTML).toContain("color:#ff4655");
  });

  it("focuses the editor as soon as it mounts", () => {
    const { editor } = renderEditor();

    expect(editor.isConnected).toBe(true);
    expect(document.activeElement).toBe(editor);
  });

  it("renders a full-screen mobile editor and does not submit on Enter", () => {
    mockIsMobile.mockReturnValue(true);

    const onChange = jest.fn();
    const onClose = jest.fn();

    render(
      <TextEditor
        spans={[{ text: "mobile text" }]}
        fontSize={18}
        width={100}
        height={40}
        onChange={onChange}
        onClose={onClose}
      />,
    );

    expect(
      screen.getByRole("dialog", { name: "Edit text" }),
    ).toBeInTheDocument();

    const editor = document.querySelector<HTMLDivElement>(
      '[contenteditable="true"]',
    );
    if (!editor) throw new Error("editor not found");

    fireEvent.keyDown(editor, { key: "Enter" });

    expect(onChange).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Done/i }));

    expect(onClose).toHaveBeenCalled();
  });

  it("keeps the original text when closing before typing", () => {
    const { onChange, editor } = renderEditor({ spans: [{ text: "keep me" }] });

    editor.innerHTML = "";
    jest.advanceTimersByTime(100);
    fireEvent.pointerDown(document.body);

    expect(onChange).toHaveBeenCalledWith({
      spans: [{ text: "keep me" }],
      fontSize: 18,
    });
  });

  it("applies bold formatting through the toolbar", () => {
    const execCommand = jest.fn().mockReturnValue(true);
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    });

    const { getByRole } = renderEditor();

    fireEvent.mouseDown(getByRole("button", { name: "Bold" }));
    fireEvent.click(getByRole("button", { name: "Bold" }));

    expect(execCommand).toHaveBeenCalledWith("bold", false, undefined);
  });

  it("commits the chosen font size", () => {
    const { onChange, onClose, getByRole } = renderEditor();

    fireEvent.change(getByRole("combobox", { name: "Font size" }), {
      target: { value: "24" },
    });

    jest.advanceTimersByTime(100);
    fireEvent.pointerDown(document.body);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ fontSize: 24 }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("toggles bullet markers on the current line", () => {
    const { getByRole, editor } = renderEditor();

    fireEvent.mouseDown(getByRole("button", { name: "Bullet list" }));
    fireEvent.click(getByRole("button", { name: "Bullet list" }));

    expect(editor.textContent).toBe("• start");

    fireEvent.mouseDown(getByRole("button", { name: "Bullet list" }));
    fireEvent.click(getByRole("button", { name: "Bullet list" }));

    expect(editor.textContent).toBe("start");
  });

  it("numbers selected lines", () => {
    const { getByRole, editor } = renderEditor();

    editor.innerHTML = "one<br>two";
    fireEvent.input(editor);

    const range = document.createRange();
    range.selectNodeContents(editor);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    fireEvent.mouseDown(getByRole("button", { name: "Numbered list" }));
    fireEvent.click(getByRole("button", { name: "Numbered list" }));

    expect(spansToPlainText(readSpansFromDom(editor))).toBe(
      "1. one\n2. two",
    );
  });

  it("continues a bullet list when pressing Enter", () => {
    const { editor, onChange, onClose } = renderEditor({
      spans: [{ text: "• item" }],
    });

    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    fireEvent.keyDown(editor, { key: "Enter" });

    expect(
      spansToPlainText(
        readSpansFromDom(editor, { trimTrailingNewlines: false }),
      ),
    ).toBe("• item\n• ");
    expect(onChange).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("continues numbered lists with the next number", () => {
    const { editor } = renderEditor({ spans: [{ text: "2. item" }] });

    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    fireEvent.keyDown(editor, { key: "Enter" });

    expect(
      spansToPlainText(
        readSpansFromDom(editor, { trimTrailingNewlines: false }),
      ),
    ).toBe("2. item\n3. ");
  });

  it("does not commit or insert manually on Shift+Enter", () => {
    const execCommand = jest.fn().mockReturnValue(true);
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    });

    const { editor, onChange, onClose } = renderEditor();

    fireEvent.keyDown(editor, { key: "Enter", shiftKey: true });

    expect(execCommand).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("toggles a list on an empty text box", () => {
    const { getByRole, editor } = renderEditor({ spans: [] });

    fireEvent.mouseDown(getByRole("button", { name: "Bullet list" }));
    fireEvent.click(getByRole("button", { name: "Bullet list" }));

    expect(spansToPlainText(readSpansFromDom(editor))).toBe("• ");
  });

  it("toggles a list on a new empty line without touching the previous line", () => {
    const { getByRole, editor } = renderEditor();

    editor.innerHTML = "start<br>";
    fireEvent.input(editor);

    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    fireEvent.mouseDown(getByRole("button", { name: "Bullet list" }));
    fireEvent.click(getByRole("button", { name: "Bullet list" }));

    expect(
      spansToPlainText(readSpansFromDom(editor)),
    ).toBe("start\n• ");
  });

  it("exits list mode by removing the empty marker without closing", () => {
    const { editor, onChange, onClose } = renderEditor({
      spans: [{ text: "• item\n• " }],
    });

    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    fireEvent.keyDown(editor, { key: "Enter" });

    expect(
      spansToPlainText(
        readSpansFromDom(editor, { trimTrailingNewlines: false }),
      ),
    ).toBe("• item\n");
    expect(onChange).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("clears a lone empty list marker when pressing Enter", () => {
    const { editor, onChange, onClose } = renderEditor({
      spans: [{ text: "• " }],
    });

    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    fireEvent.keyDown(editor, { key: "Enter" });

    expect(editor.textContent).toBe("");
    expect(onChange).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
