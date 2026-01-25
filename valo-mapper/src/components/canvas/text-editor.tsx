import { Html } from "react-konva-utils";
import { useCallback, useRef } from "react";
import Konva from "konva";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface TextEditorProps {
  textNode: Konva.Text;
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
  const cleanupRef = useRef<(() => void) | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const textareaCallbackRef = useCallback(
    (textarea: HTMLTextAreaElement | null) => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }

      if (!textarea || !textNode) return;

      textareaRef.current = textarea;

      const textPosition = textNode.position();

      textarea.value = text;
      textarea.style.height = "auto";

      textarea.style.position = "absolute";
      textarea.style.top = `${textPosition.y}px`;
      textarea.style.left = `${textPosition.x}px`;
      textarea.style.width = `${textNode.width()}px`;
      textarea.style.height = `${Math.max(60, textNode.height())}px`;
      textarea.style.fontSize = `${textNode.fontSize()}px`;
      textarea.style.border = "none";
      textarea.style.padding = `${textNode.padding()}px`;
      textarea.style.margin = "0px";
      textarea.style.overflow = "hidden";
      textarea.style.background = "none";
      textarea.style.outline = "none";
      textarea.style.resize = "none";
      textarea.style.lineHeight = textNode.lineHeight().toString();
      textarea.style.fontFamily = textNode.fontFamily();
      textarea.style.transformOrigin = "left top";
      textarea.style.textAlign = textNode.align();
      textarea.style.color = "#ffffff";
      textarea.style.backgroundColor = "#18181b";
      textarea.style.borderRadius = "8px";

      textarea.focus();
      textarea.select();

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onChange(textarea.value);
          onClose();
        }
        if (e.key === "Escape") {
          onClose();
        }
      };

      const handleInput = () => {
        textarea.style.height = "auto";
        const width = textarea.scrollWidth;
        const height = textarea.scrollHeight;
        textarea.style.width = `${width}px`;
        textarea.style.height = `${Math.max(60, height)}px`;
        textNode.width(width);
      };

      const handleOutsideClick = (e: MouseEvent) => {
        if (e.target !== textarea) {
          onChange(textarea.value);
          onClose();
        }
      };

      textarea.addEventListener("keydown", handleKeyDown);
      textarea.addEventListener("input", handleInput);

      const timeoutId = setTimeout(() => {
        window.addEventListener("click", handleOutsideClick);
      }, 100);

      cleanupRef.current = () => {
        clearTimeout(timeoutId);
        textarea.removeEventListener("keydown", handleKeyDown);
        textarea.removeEventListener("input", handleInput);
        window.removeEventListener("click", handleOutsideClick);
      };
    },
    [textNode, text, onChange, onClose],
  );

  return (
    <Html>
      <div>
        <textarea ref={textareaCallbackRef} />
        <Button
          variant="default"
          size="icon"
          className="absolute -top-2 -right-2 rounded-full size-6"
          onClick={(e) => {
            e.stopPropagation();
            onChange(textareaRef.current?.value || "");
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
