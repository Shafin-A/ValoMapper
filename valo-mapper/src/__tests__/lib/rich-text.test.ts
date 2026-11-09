import {
  applyListMarker,
  layoutRichText,
  normalizeTextColor,
  normalizeTextSpans,
  parseListMarker,
  readSpansFromDom,
  removeListMarker,
  renumberListLines,
  spansToEditorHtml,
  spansToHtml,
  spansToPlainText,
  type RichTextMeasure,
} from "@/lib/rich-text";

const fixedMeasure: RichTextMeasure = (text) => text.length * 10;

describe("rich text spans", () => {
  it("merges adjacent runs with identical styles", () => {
    const spans = normalizeTextSpans([
      { text: "hel" },
      { text: "lo" },
      { text: "!", bold: true },
      { text: "?", bold: true },
    ]);

    expect(spans).toEqual([{ text: "hello" }, { text: "!?", bold: true }]);
    expect(spansToPlainText(spans)).toBe("hello!?");
  });

  it("falls back to plain text when spans are absent", () => {
    expect(normalizeTextSpans(undefined, "legacy text")).toEqual([
      { text: "legacy text" },
    ]);
  });

  it("normalizes colors and drops the default white", () => {
    expect(normalizeTextColor("#fff")).toBeUndefined();
    expect(normalizeTextColor("rgb(255, 255, 255)")).toBeUndefined();
    expect(normalizeTextColor("rgb(255, 70, 85)")).toBe("#ff4655");
    expect(normalizeTextColor("#FF4655")).toBe("#ff4655");
    expect(normalizeTextColor("not-a-color")).toBeUndefined();
  });

  it("serializes sanitized HTML and preserves newlines", () => {
    const html = spansToHtml([
      { text: "<script>", bold: true },
      { text: "\nnext" },
    ]);

    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).toContain("<br>");
    expect(html).toContain("font-weight:700");
  });

  it("reads nested formatting from the editor DOM", () => {
    const root = document.createElement("div");
    root.innerHTML = [
      "plain ",
      "<b>bold</b> ",
      "<i><u>both</u></i>",
      '<span style="color: rgb(255, 70, 85)">red</span>',
      "<div>next</div>",
    ].join("");

    const spans = readSpansFromDom(root);

    expect(spansToPlainText(spans)).toBe("plain bold bothred\nnext");
    expect(spans).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ text: "bold", bold: true }),
        expect.objectContaining({
          text: "both",
          italic: true,
          underline: true,
        }),
        expect.objectContaining({ text: "red", color: "#ff4655" }),
      ]),
    );
  });

  it("reads line breaks as newlines", () => {
    const root = document.createElement("div");
    root.innerHTML = "a<br>b<br><br>c";

    expect(spansToPlainText(readSpansFromDom(root))).toBe("a\nb\n\nc");
  });

  it("round-trips spans through the editor HTML", () => {
    const spans = [
      { text: "bold", bold: true },
      { text: " italic", italic: true },
      { text: " under", underline: true },
      { text: " red", color: "#ff4655" },
    ];

    const root = document.createElement("div");
    root.innerHTML = spansToHtml(spans);

    expect(readSpansFromDom(root)).toEqual(spans);
  });
});

describe("layoutRichText", () => {
  it("wraps styled words at the available width", () => {
    const layout = layoutRichText(
      [{ text: "hello " }, { text: "world", bold: true }],
      { width: 100, padding: 10, fontSize: 18 },
      fixedMeasure,
    );

    expect(layout.lines).toHaveLength(2);
    expect(layout.lines[0].segments.map((segment) => segment.text)).toEqual([
      "hello ",
    ]);
    expect(layout.lines[1].segments).toEqual([
      expect.objectContaining({ text: "world", x: 10 }),
    ]);
    expect(layout.lines[1].segments[0].style.bold).toBe(true);
  });

  it("keeps runs on the same line and positions them after each other", () => {
    const layout = layoutRichText(
      [{ text: "ab", bold: true }, { text: "cd", color: "#ff4655" }],
      { width: 100, padding: 10, fontSize: 18 },
      fixedMeasure,
    );

    expect(layout.lines).toHaveLength(1);
    expect(layout.lines[0].segments).toEqual([
      expect.objectContaining({ text: "ab", x: 10, width: 20 }),
      expect.objectContaining({ text: "cd", x: 30, width: 20 }),
    ]);
  });

  it("honors newlines and computes the layout height", () => {
    const layout = layoutRichText(
      [{ text: "a\nb" }],
      { width: 100, padding: 10, fontSize: 20, lineHeight: 1.5 },
      fixedMeasure,
    );

    expect(layout.lines).toHaveLength(2);
    expect(layout.lines[0].y).toBe(10);
    expect(layout.lines[1].y).toBe(40);
    expect(layout.height).toBe(20 + 2 * 30);
  });

  it("breaks words that are wider than the box", () => {
    const layout = layoutRichText(
      [{ text: "abcdefghij" }],
      { width: 100, padding: 10, fontSize: 18 },
      fixedMeasure,
    );

    expect(layout.lines.map((line) => line.segments[0].text)).toEqual([
      "abcdefgh",
      "ij",
    ]);
  });
});

describe("list markers", () => {
  it("parses bullet and numbered markers", () => {
    expect(parseListMarker("• item")).toMatchObject({
      type: "bullet",
      token: "•",
      leading: "",
      contentStart: 2,
    });
    expect(parseListMarker("  2) item")).toMatchObject({
      type: "number",
      token: "2)",
      number: 2,
      leading: "  ",
      contentStart: 5,
    });
    expect(parseListMarker("1.5 meters")).toBeNull();
    expect(parseListMarker("- item")).toMatchObject({ type: "bullet" });
  });

  it("adds and removes markers while preserving text", () => {
    const line = normalizeTextSpans([{ text: "hello", bold: true }]);
    const bulleted = applyListMarker(line, "bullet");
    const numbered = applyListMarker(line, "number", 3);

    expect(spansToPlainText(bulleted)).toBe("• hello");
    expect(spansToPlainText(numbered)).toBe("3. hello");
    expect(spansToPlainText(removeListMarker(numbered))).toBe("hello");
    expect(bulleted[0]?.bold).toBe(true);
  });

  it("renumbers consecutive numbered lines and restarts after a break", () => {
    const input = normalizeTextSpans([
      { text: "2. one\n9. two\n• bullet\n1. restart" },
    ]);

    expect(spansToPlainText(renumberListLines(input))).toBe(
      "1. one\n2. two\n• bullet\n1. restart",
    );
  });

  it("hangs wrapped list lines under the item content", () => {
    const layout = layoutRichText(
      [{ text: "• alpha beta" }],
      { width: 100, padding: 10, fontSize: 18 },
      fixedMeasure,
    );

    expect(layout.lines).toHaveLength(2);
    expect(layout.lines[0].segments.map((segment) => segment.text)).toEqual([
      "• ",
      "alpha ",
    ]);
    expect(layout.lines[1].segments[0]).toMatchObject({
      text: "beta",
      x: 30,
    });
    expect(layout.height).toBe(20 + 2 * 18);
  });

  it("serializes list lines with a hanging-indent content wrapper", () => {
    const html = spansToEditorHtml(
      [{ text: "• item" }, { text: "\nplain" }],
      { fontSize: 18 },
    );

    expect(html).toContain('data-text-content-line="0"');
    expect(html).toContain("display:inline-block");
    expect(html).toContain("calc(100% -");
    expect(html).toContain("<br>");
    expect(html).toContain("• ");
    expect(html).toContain("plain");
  });

  it("uses a zero-width placeholder for empty list content", () => {
    const html = spansToEditorHtml([{ text: "• " }], { fontSize: 18 });

    expect(html).toContain("\u200b");
  });

  it("ignores zero-width placeholders when reading editor HTML", () => {
    const root = document.createElement("div");
    root.innerHTML =
      '<span>* </span><span data-text-content-line="0">\u200b</span>';

    expect(spansToPlainText(readSpansFromDom(root))).toBe("* ");
  });
});
