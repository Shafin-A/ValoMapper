import { Html } from "react-konva-utils";
import { useLayoutEffect, useEffect, useRef, useState } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import Konva from "konva";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface TextEditorProps {
  textNode?: Konva.Text | null;
  text: string;
  onClose: () => void;
  onChange: (text: string) => void;
}

export const TextEditor = ({
  textNode,
  text,
  onClose,
  onChange,
}: TextEditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const currentTextRef = useRef(text);
  const [currentText, setCurrentText] = useState(text);
  const [textareaSize, setTextareaSize] = useState({
    width: textNode?.width() ?? 100,
    height: Math.max(60, textNode?.height() ?? 0),
  });

  const handleTextareaMouseDown = (e: ReactMouseEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
  };

  useEffect(() => {
    currentTextRef.current = currentText;
  }, [currentText]);

  useLayoutEffect(() => {
    setTextareaSize({
      width: textNode?.width() ?? 100,
      height: Math.max(60, textNode?.height() ?? 0),
    });

    const focusTextarea = () => {
      const textarea = textareaRef.current;
      if (!textarea) return false;

      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      return true;
    };

    let focusTimer = window.setTimeout(() => {
      if (!focusTextarea()) {
        focusTimer = window.setTimeout(focusTextarea, 50);
      }
    }, 0);

    const handleOutsideClick = (e: globalThis.MouseEvent) => {
      const textarea = textareaRef.current;
      if (textarea && e.target !== textarea) {
        onChange(currentTextRef.current);
        onClose();
      }
    };

    const clickTimer = window.setTimeout(() => {
      window.addEventListener("click", handleOutsideClick);
    }, 100);

    return () => {
      window.removeEventListener("click", handleOutsideClick);
      window.clearTimeout(clickTimer);
      window.clearTimeout(focusTimer);
    };
  }, [textNode, onChange, onClose]);

  const baseStyle: CSSProperties = {
    position: "absolute",
    top: `${textNode?.position().y ?? 0}px`,
    left: `${textNode?.position().x ?? 0}px`,
    width: `${textareaSize.width}px`,
    height: `${textareaSize.height}px`,
    fontSize: `${textNode?.fontSize() ?? 18}px`,
    border: "none",
    padding: `${textNode?.padding() ?? 10}px`,
    margin: 0,
    overflow: "hidden",
    background: "none",
    outline: "none",
    resize: "none",
    lineHeight: `${textNode?.lineHeight() ?? 1.2}`,
    fontFamily: textNode?.fontFamily() ?? "Arial",
    transformOrigin: "left top",
    // textAlign: textNode?.align() ?? "left",
    color: "#ffffff",
    backgroundColor: "#18181b",
    borderRadius: "8px",
    //zIndex: 500,
    //pointerEvents: "none",
  };

  return (
    <Html>
      <div>
        <textarea
          style={baseStyle}
          ref={textareaRef}
          value={currentText}
          onMouseDown={handleTextareaMouseDown}
          onChange={(e) => {
            const value = e.target.value;
            setCurrentText(value);
            const width = e.target.scrollWidth;
            const height = e.target.scrollHeight;
            setTextareaSize({
              width: Math.max(100, width),
              height: Math.max(60, height),
            });
            if (textNode) textNode.width(width);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onChange(currentText);
              onClose();
            }
            if (e.key === "Escape") {
              onClose();
            }
          }}
        />
        <Button
          variant="default"
          size="icon"
          className="absolute -top-2 -right-2 rounded-full size-6"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onChange(currentText);
            onClose();
          }}
        >
          <X />
          <span className="sr-only">Close</span>
        </Button>
      </div>
    </Html>
  );
};
