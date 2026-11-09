import { Bold, Italic, List, ListOrdered, Underline } from "lucide-react";
import type { CSSProperties, MouseEvent as ReactMouseEvent, RefObject } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TEXT_COLORS, type ActiveFormats } from "./formatting";

interface TextEditorToolbarProps {
  toolbarRef: RefObject<HTMLDivElement | null>;
  style: CSSProperties;
  activeFormats: ActiveFormats;
  fontSize: number;
  sizeOptions: number[];
  onCommand: (command: string) => void;
  onColor: (color: string) => void;
  onToggleList: (type: "bullet" | "number") => void;
  onFontSizeChange: (size: number) => void;
  onMouseDown: (event: ReactMouseEvent<HTMLDivElement>) => void;
}

const formatButtonClass = (active: boolean) =>
  cn(
    "h-6 w-6 rounded text-zinc-300 hover:bg-zinc-700 hover:text-white",
    active && "bg-zinc-700 text-white",
  );

export const TextEditorToolbar = ({
  toolbarRef,
  style,
  activeFormats,
  fontSize,
  sizeOptions,
  onCommand,
  onColor,
  onToggleList,
  onFontSizeChange,
  onMouseDown,
}: TextEditorToolbarProps) => {
  const formatButtonProps = (command: string, label: string) => ({
    type: "button" as const,
    variant: "ghost" as const,
    size: "icon" as const,
    "aria-label": label,
    onMouseDown: (event: ReactMouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
    },
    onClick: () => onCommand(command),
  });

  return (
    <div ref={toolbarRef} style={style} onMouseDown={onMouseDown}>
      <Button
        {...formatButtonProps("bold", "Bold")}
        aria-pressed={activeFormats.bold}
        className={formatButtonClass(activeFormats.bold)}
      >
        <Bold />
      </Button>
      <Button
        {...formatButtonProps("italic", "Italic")}
        aria-pressed={activeFormats.italic}
        className={formatButtonClass(activeFormats.italic)}
      >
        <Italic />
      </Button>
      <Button
        {...formatButtonProps("underline", "Underline")}
        aria-pressed={activeFormats.underline}
        className={formatButtonClass(activeFormats.underline)}
      >
        <Underline />
      </Button>

      <span className="mx-1 h-4 w-px bg-zinc-700" aria-hidden />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Bullet list"
        aria-pressed={activeFormats.bullet}
        className={formatButtonClass(activeFormats.bullet)}
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onClick={() => onToggleList("bullet")}
      >
        <List />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Numbered list"
        aria-pressed={activeFormats.numbered}
        className={formatButtonClass(activeFormats.numbered)}
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onClick={() => onToggleList("number")}
      >
        <ListOrdered />
      </Button>

      <span className="mx-1 h-4 w-px bg-zinc-700" aria-hidden />

      {TEXT_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={`Text color ${color}`}
          aria-pressed={activeFormats.color === color}
          className={cn(
            "size-4 rounded-full border",
            activeFormats.color === color
              ? "border-white"
              : "border-zinc-600",
          )}
          style={{ backgroundColor: color }}
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={() => onColor(color)}
        />
      ))}

      <input
        type="color"
        aria-label="Custom text color"
        value={activeFormats.color}
        className="size-5 cursor-pointer rounded border-0 bg-transparent p-0"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => onColor(event.target.value)}
      />

      <span className="mx-1 h-4 w-px bg-zinc-700" aria-hidden />

      <select
        aria-label="Font size"
        value={fontSize}
        className="h-6 rounded bg-zinc-800 px-1 text-[11px] text-white outline-none"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => onFontSizeChange(Number(event.target.value))}
      >
        {sizeOptions.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
    </div>
  );
};
