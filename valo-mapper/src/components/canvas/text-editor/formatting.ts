import {
  DEFAULT_TEXT_COLOR,
  normalizeTextColor,
} from "@/lib/rich-text";

export type ActiveFormats = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  bullet: boolean;
  numbered: boolean;
  color: string;
};

export const EMPTY_FORMATS: ActiveFormats = {
  bold: false,
  italic: false,
  underline: false,
  bullet: false,
  numbered: false,
  color: DEFAULT_TEXT_COLOR,
};

export const TEXT_COLORS = [
  "#ffffff",
  "#f87171",
  "#fbbf24",
  "#4ade80",
  "#38bdf8",
  "#c084fc",
  "#f472b6",
];

export const readCurrentFormats = (): ActiveFormats => {
  const queryState =
    typeof document.queryCommandState === "function"
      ? document.queryCommandState.bind(document)
      : null;
  const queryValue =
    typeof document.queryCommandValue === "function"
      ? document.queryCommandValue.bind(document)
      : null;

  return {
    bold: queryState?.("bold") ?? false,
    italic: queryState?.("italic") ?? false,
    underline: queryState?.("underline") ?? false,
    bullet: false,
    numbered: false,
    color:
      normalizeTextColor(queryValue?.("foreColor")) ?? DEFAULT_TEXT_COLOR,
  };
};

export const restorePendingFormats = (
  editor: HTMLDivElement | null,
  desired: ActiveFormats,
  includeColor = true,
) => {
  if (!editor) return;

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
    return;
  }

  const queryState =
    typeof document.queryCommandState === "function"
      ? document.queryCommandState.bind(document)
      : null;
  if (!queryState) return;

  const ensure = (command: string, wanted: boolean) => {
    try {
      if (queryState(command) !== wanted) {
        document.execCommand(command, false);
      }
    } catch {
    }
  };

  ensure("bold", desired.bold);
  ensure("italic", desired.italic);
  ensure("underline", desired.underline);

  if (!includeColor) return;

  const queryValue =
    typeof document.queryCommandValue === "function"
      ? document.queryCommandValue.bind(document)
      : null;
  const currentColor =
    normalizeTextColor(queryValue?.("foreColor")) ?? DEFAULT_TEXT_COLOR;

  if (currentColor !== desired.color) {
    try {
      document.execCommand("styleWithCSS", false, "true");
      document.execCommand("foreColor", false, desired.color);
    } catch {
    }
  }
};

// Use an editing command so the rewrite is undoable.
export const replaceEditorContent = (
  editor: HTMLDivElement | null,
  html: string,
) => {
  if (!editor) return;

  const before = editor.innerHTML;
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(editor);
  selection?.removeAllRanges();
  selection?.addRange(range);
  editor.focus();

  try {
    if (html) {
      document.execCommand("insertHTML", false, html);
    } else {
      document.execCommand("delete", false);
    }
  } catch {
  }

  if (editor.innerHTML === before && before !== html) {
    editor.innerHTML = html;
  }
};
