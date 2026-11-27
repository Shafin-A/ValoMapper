import { redirectSelectionToContentStart } from "@/components/canvas/text-editor/editor-dom";
import { spansToEditorHtml } from "@/lib/rich-text";

const createEditor = (text: string) => {
  const editor = document.createElement("div");
  editor.innerHTML = spansToEditorHtml([{ text }], { fontSize: 18 });
  document.body.appendChild(editor);
  return editor;
};

const setCaret = (node: Node, offset: number) => {
  const range = document.createRange();
  range.setStart(node, offset);
  range.collapse(true);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
};

describe("redirectSelectionToContentStart", () => {
  afterEach(() => {
    window.getSelection()?.removeAllRanges();
    document.body.innerHTML = "";
  });

  it("moves a caret in a list marker to the item content", () => {
    const editor = createEditor("• item");
    const marker = editor.querySelector<HTMLElement>(
      '[data-text-marker-line="0"]',
    );
    const content = editor.querySelector<HTMLElement>(
      '[data-text-content-line="0"]',
    );
    if (!marker || !content || !marker.firstChild) {
      throw new Error("list markup missing");
    }

    setCaret(marker.firstChild, 2);

    expect(redirectSelectionToContentStart(editor)).toBe(true);

    expect(content.firstChild?.nodeValue).toBe("\u200b");
    expect(content.textContent).toBe("\u200bitem");
    const selection = window.getSelection();
    expect(selection?.anchorNode).toBe(content.firstChild);
    expect(selection?.anchorOffset).toBe(1);
  });

  it("moves a caret at the content start behind a sentinel", () => {
    const editor = createEditor("• item");
    const content = editor.querySelector<HTMLElement>(
      '[data-text-content-line="0"]',
    );
    if (!content || !content.firstChild) {
      throw new Error("content markup missing");
    }

    setCaret(content.firstChild, 0);

    expect(redirectSelectionToContentStart(editor)).toBe(true);

    expect(content.firstChild?.nodeValue).toBe("\u200b");
    expect(content.textContent).toBe("\u200bitem");
    const selection = window.getSelection();
    expect(selection?.anchorNode).toBe(content.firstChild);
    expect(selection?.anchorOffset).toBe(1);
  });

  it("leaves a caret inside the item content alone", () => {
    const editor = createEditor("• item");
    const content = editor.querySelector<HTMLElement>(
      '[data-text-content-line="0"]',
    );
    if (!content || !content.firstChild) {
      throw new Error("content markup missing");
    }

    setCaret(content.firstChild, 2);

    expect(redirectSelectionToContentStart(editor)).toBe(false);

    expect(content.firstChild.nodeValue).toBe("item");
    const selection = window.getSelection();
    expect(selection?.anchorNode).toBe(content.firstChild);
    expect(selection?.anchorOffset).toBe(2);
  });

  it("ignores plain lines without list markers", () => {
    const editor = createEditor("plain");
    const text = editor.firstChild;
    if (!text) throw new Error("text missing");

    setCaret(text, 0);

    expect(redirectSelectionToContentStart(editor)).toBe(false);
    expect(editor.textContent).toBe("plain");
  });
});

