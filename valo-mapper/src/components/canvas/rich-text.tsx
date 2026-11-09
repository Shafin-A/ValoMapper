import { Text } from "react-konva";
import type { RichTextLayout } from "@/lib/rich-text";
import type { TextStyle } from "@/lib/types";

const fontStyleFor = (style: TextStyle): string => {
  const parts: string[] = [];
  if (style.bold) parts.push("bold");
  if (style.italic) parts.push("italic");
  return parts.length > 0 ? parts.join(" ") : "normal";
};

interface RichTextProps {
  layout: RichTextLayout;
}

export const RichText = ({ layout }: RichTextProps) => {
  return (
    <>
      {layout.lines.map((line, lineIndex) =>
        line.segments.map((segment, segmentIndex) => (
          <Text
            key={`${lineIndex}-${segmentIndex}`}
            x={segment.x}
            y={line.y}
            text={segment.text}
            fontSize={layout.fontSize}
            fontFamily={layout.fontFamily}
            lineHeight={layout.lineHeight}
            fontStyle={fontStyleFor(segment.style)}
            textDecoration={segment.style.underline ? "underline" : ""}
            fill={segment.style.color ?? "#ffffff"}
            listening={false}
            perfectDrawEnabled={false}
          />
        )),
      )}
    </>
  );
};
