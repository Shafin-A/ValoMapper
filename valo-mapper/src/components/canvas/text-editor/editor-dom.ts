import { readSpansFromDom, spansToPlainText } from "@/lib/rich-text";

export type LineInfo = { start: number; end: number; text: string };
export type TextPosition = { node: Node; offset: number };

export const getLineInfos = (text: string): LineInfo[] => {
  const lines: LineInfo[] = [];
  let start = 0;

  for (const line of text.split("\n")) {
    lines.push({ start, end: start + line.length, text: line });
    start += line.length + 1;
  }

  return lines;
};

export const findLineIndex = (lines: LineInfo[], offset: number): number => {
  for (let index = 0; index < lines.length; index += 1) {
    if (offset <= lines[index].end) return index;
  }

  return lines.length - 1;
};

const measureTextOffset = (
  editor: HTMLDivElement,
  node: Node,
  offset: number,
): number => {
  const prefix = document.createRange();
  prefix.selectNodeContents(editor);
  prefix.setEnd(node, offset);

  const fragment = prefix.cloneContents();
  const container = document.createElement("div");
  container.appendChild(fragment);

  return spansToPlainText(
    readSpansFromDom(container, { trimTrailingNewlines: false }),
  ).length;
};

export const getSelectionTextOffsets = (
  editor: HTMLDivElement,
): { start: number; end: number } | null => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  if (!selection.anchorNode || !editor.contains(selection.anchorNode)) {
    return null;
  }

  const range = selection.getRangeAt(0);

  return {
    start: measureTextOffset(editor, range.startContainer, range.startOffset),
    end: measureTextOffset(editor, range.endContainer, range.endOffset),
  };
};

const findTextPosition = (
  root: HTMLElement,
  target: number,
): TextPosition | null => {
  let remaining = target;
  let result: TextPosition | null = null;

  const visit = (node: Node): boolean => {
    if (node.nodeType === 3) {
      const text = node.nodeValue ?? "";
      const visibleLength = text.replace(/\u200b/g, "").length;

      if (remaining <= visibleLength) {
        if (remaining === 0) {
          result = { node, offset: 0 };
          return true;
        }

        let offset = 0;
        let visible = 0;

        while (offset < text.length) {
          if (text[offset] !== "\u200b") {
            if (visible === remaining) break;
            visible += 1;
          }
          offset += 1;
        }

        result = { node, offset };
        return true;
      }

      remaining -= visibleLength;
      return false;
    }

    if (node.nodeType !== 1) return false;

    const element = node as HTMLElement;

    if (element.tagName === "BR") {
      if (remaining === 0) {
        const parent = element.parentNode;
        if (parent) {
          result = {
            node: parent,
            offset: Array.prototype.indexOf.call(
              parent.childNodes,
              element,
            ) as number,
          };
          return true;
        }
      }

      remaining -= 1;
      return false;
    }

    for (const child of Array.from(element.childNodes)) {
      if (visit(child)) return true;
    }

    return false;
  };

  if (visit(root)) return result;
  return { node: root, offset: root.childNodes.length };
};

export const setSelectionByOffsets = (
  editor: HTMLDivElement,
  start: number,
  end: number,
) => {
  const startPosition = findTextPosition(editor, start);
  const endPosition = findTextPosition(editor, end);
  if (!startPosition || !endPosition) return;

  editor.focus();

  const range = document.createRange();
  range.setStart(startPosition.node, startPosition.offset);
  range.setEnd(endPosition.node, endPosition.offset);

  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
};

export const setCaretInContentSpan = (
  editor: HTMLDivElement,
  lineIndex: number,
  offset = 0,
): boolean => {
  const content = editor.querySelector<HTMLElement>(
    `[data-text-content-line="${lineIndex}"]`,
  );
  if (!content) return false;

  editor.focus();

  const range = document.createRange();
  let remaining = Math.max(0, offset);
  let position: TextPosition | null = null;

  const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
  let textNode = walker.nextNode();

  while (textNode) {
    const length = textNode.nodeValue?.length ?? 0;

    if (remaining <= length) {
      position = { node: textNode, offset: remaining };
      break;
    }

    remaining -= length;
    textNode = walker.nextNode();
  }

  if (position) {
    let domOffset = position.offset;

    // Type after the zero-width placeholder so text lands in the content span.
    if (domOffset === 0 && position.node.nodeType === 3) {
      const value = position.node.nodeValue ?? "";
      let leading = 0;
      while (value[leading] === "\u200b") leading += 1;
      domOffset = leading;
    }

    range.setStart(position.node, domOffset);
    range.collapse(true);
  } else {
    range.selectNodeContents(content);
    range.collapse(false);
  }

  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  return true;
};
