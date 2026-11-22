import { Bold, Italic, List, ListOrdered, Underline } from "lucide-react";
import type { CSSProperties, MouseEvent as ReactMouseEvent, RefObject } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useTranslations } from "next-intl";
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
  mobile?: boolean;
}

const formatButtonClass = (active: boolean, mobile?: boolean) =>
  cn(
    mobile ? "h-10 w-10" : "h-6 w-6",
    "shrink-0 rounded text-zinc-300 hover:bg-zinc-700 hover:text-white",
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
  mobile = false,
}: TextEditorToolbarProps) => {
  const t = useTranslations("canvas.textEditor");
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
        {...formatButtonProps("bold", t("bold"))}
        aria-pressed={activeFormats.bold}
        className={formatButtonClass(activeFormats.bold, mobile)}
      >
        <Bold />
      </Button>
      <Button
        {...formatButtonProps("italic", t("italic"))}
        aria-pressed={activeFormats.italic}
        className={formatButtonClass(activeFormats.italic, mobile)}
      >
        <Italic />
      </Button>
      <Button
        {...formatButtonProps("underline", t("underline"))}
        aria-pressed={activeFormats.underline}
        className={formatButtonClass(activeFormats.underline, mobile)}
      >
        <Underline />
      </Button>

      <span
        className={cn("mx-1 w-px bg-zinc-700", mobile ? "h-6" : "h-4")}
        aria-hidden
      />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t("bulletList")}
        aria-pressed={activeFormats.bullet}
        className={formatButtonClass(activeFormats.bullet, mobile)}
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
        aria-label={t("numberedList")}
        aria-pressed={activeFormats.numbered}
        className={formatButtonClass(activeFormats.numbered, mobile)}
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onClick={() => onToggleList("number")}
      >
        <ListOrdered />
      </Button>

      <span
        className={cn("mx-1 w-px bg-zinc-700", mobile ? "h-6" : "h-4")}
        aria-hidden
      />

      {TEXT_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={t("textColor", { color })}
          aria-pressed={activeFormats.color === color}
          className={cn(
            "shrink-0 rounded-full border",
            mobile ? "size-7" : "size-4",
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
        aria-label={t("customColor")}
        value={activeFormats.color}
        className={cn(
          "shrink-0 cursor-pointer rounded border-0 bg-transparent p-0",
          mobile ? "size-8" : "size-5",
        )}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => onColor(event.target.value)}
      />

      <span
        className={cn("mx-1 w-px bg-zinc-700", mobile ? "h-6" : "h-4")}
        aria-hidden
      />

      <select
        aria-label={t("fontSize")}
        value={fontSize}
        className={cn(
          "shrink-0 rounded bg-zinc-800 px-1 text-white outline-none",
          mobile ? "h-10 text-base" : "h-6 text-[11px]",
        )}
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
