"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Check,
  ChevronDown,
  Copy,
  FileVideo,
  HelpCircle,
  UploadCloud,
} from "lucide-react";
import {
  DragEvent,
  ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

const REPLAY_FILE_EXTENSION = ".vrf";
const REPLAY_FOLDER = "%localappdata%\\VALORANT\\Saved\\Demos";

export const ReplayFileDropzone = ({
  onFileSelected,
  disabled = false,
}: {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const copyResetTimeoutRef = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCopied, setHasCopied] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  useEffect(
    () => () => {
      if (copyResetTimeoutRef.current !== null) {
        window.clearTimeout(copyResetTimeoutRef.current);
      }
    },
    [],
  );

  const handleCopyLocation = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(REPLAY_FOLDER);

      setHasCopied(true);
      toast.success("Replay folder location copied");

      if (copyResetTimeoutRef.current !== null) {
        window.clearTimeout(copyResetTimeoutRef.current);
      }

      copyResetTimeoutRef.current = window.setTimeout(() => {
        setHasCopied(false);
      }, 2000);
    } catch {
      toast.error("Couldn't copy the location. Select it manually instead.");
    }
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.toLowerCase().endsWith(REPLAY_FILE_EXTENSION)) {
        setError("Choose a .vrf replay file exported by VALORANT.");
        return;
      }

      setError(null);
      onFileSelected(file);
    },
    [onFileSelected],
  );

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    event.target.value = "";
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) {
      return;
    }

    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "flex min-h-60 flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/10"
            : "border-slate-700 bg-slate-900/40 hover:border-primary/70 hover:bg-slate-900/70",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload a VALORANT replay file"
          onClick={() => !disabled && inputRef.current?.click()}
          onKeyDown={(event) => {
            if ((event.key === "Enter" || event.key === " ") && !disabled) {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          className="group flex cursor-pointer flex-col items-center gap-4"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-700 bg-slate-950/80 text-primary transition-transform group-hover:scale-105">
            <UploadCloud className="h-7 w-7" />
          </div>

          <div className="space-y-1">
            <p className="text-base font-semibold text-white">
              Drop a .vrf replay here
            </p>
            <p className="text-sm text-white/70">
              or click to choose a file from your computer
            </p>
          </div>
        </div>

        <div className="flex w-full max-w-md flex-col gap-2">
          <div className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-950/60 p-1.5 pl-2.5 text-[11px] text-white/60">
            <FileVideo className="size-3.5 shrink-0 text-primary" />
            <code className="min-w-0 flex-1 break-all text-left font-mono text-white/70">
              {REPLAY_FOLDER}
            </code>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleCopyLocation}
              className="h-7 shrink-0 px-2 text-[11px]"
              aria-label={
                hasCopied
                  ? "Replay folder location copied"
                  : "Copy replay folder location"
              }
            >
              {hasCopied ? (
                <Check className="size-3.5 text-primary" />
              ) : (
                <Copy className="size-3.5" />
              )}
              {hasCopied ? "Copied" : "Copy"}
            </Button>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => !disabled && inputRef.current?.click()}
            disabled={disabled}
          >
            Choose .vrf file
          </Button>
        </div>

        <div className="w-full max-w-md">
          <button
            type="button"
            onClick={() => setIsHelpOpen((open) => !open)}
            aria-expanded={isHelpOpen}
            className="mx-auto flex items-center justify-center gap-1.5 text-xs font-medium text-white/70 transition-colors hover:text-white"
          >
            <HelpCircle className="size-3.5" />
            Where do I find my replay files?
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform",
                isHelpOpen && "rotate-180",
              )}
            />
          </button>

          {isHelpOpen && (
            <div className="mt-3 space-y-2 rounded-md border border-slate-800 bg-slate-950/60 p-3 text-left text-xs leading-relaxed text-white/60">
              <p>
                Click <span className="font-medium text-white/80">Copy</span>{" "}
                above. The location will be copied to your clipboard.
              </p>
              <p>
                Paste the location into the address bar at the top of a Windows
                file explorer and press Enter. Your{" "}
                <code className="font-mono text-white/80">.vrf</code> replay
                files will be there.
              </p>
              <p>
                Drag one into this box, or click{" "}
                <span className="font-medium text-white/80">
                  Choose .vrf file
                </span>
                .
              </p>
            </div>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={REPLAY_FILE_EXTENSION}
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled}
      />

      {error && (
        <p className="text-sm text-rose-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
