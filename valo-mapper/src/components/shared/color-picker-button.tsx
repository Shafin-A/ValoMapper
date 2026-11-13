"use client";

import { useState } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/cn";

const COLOR_PRESETS = [
  "#18636c",
  "#FF4655",
  "#42EEC7",
  "#4ade80",
  "#22c55e",
  "#eab308",
  "#f97316",
  "#ef4444",
  "#a855f7",
  "#3b82f6",
  "#0ea5e9",
  "#64748b",
  "#f472b6",
  "#facc15",
  "#ffffff",
  "#000000",
];

interface ColorPickerButtonProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  className?: string;
}

export const ColorPickerButton = ({
  label,
  value,
  onChange,
  className,
}: ColorPickerButtonProps) => {
  const [open, setOpen] = useState(false);
  const normalizedValue = value.toLowerCase();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            "h-6 w-6 rounded border border-zinc-600",
            className,
          )}
          style={{ backgroundColor: value }}
        />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="grid grid-cols-4 gap-1.5">
          {COLOR_PRESETS.map((color) => {
            const isSelected = normalizedValue === color.toLowerCase();
            return (
              <button
                key={color}
                type="button"
                aria-label={`${label} ${color}`}
                aria-pressed={isSelected}
                className={cn(
                  "h-7 w-7 rounded border",
                  isSelected ? "border-white" : "border-zinc-600",
                )}
                style={{ backgroundColor: color }}
                onClick={() => {
                  onChange(color);
                  setOpen(false);
                }}
              />
            );
          })}
        </div>
        <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          Custom
          <input
            type="color"
            value={value}
            aria-label={`${label} custom color`}
            onChange={(event) => onChange(event.target.value)}
            className="h-7 w-10 cursor-pointer rounded border border-zinc-600 bg-transparent p-0"
          />
        </label>
      </PopoverContent>
    </Popover>
  );
};
