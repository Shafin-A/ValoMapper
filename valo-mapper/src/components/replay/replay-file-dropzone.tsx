"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
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
import { useTranslations } from "next-intl";
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
  const t = useTranslations("replay.dropzone");
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
      toast.success(t("copyToast"));

      if (copyResetTimeoutRef.current !== null) {
        window.clearTimeout(copyResetTimeoutRef.current);
      }

      copyResetTimeoutRef.current = window.setTimeout(() => {
        setHasCopied(false);
      }, 2000);
    } catch {
      toast.error(t("copyError"));
    }
  }, [t]);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.toLowerCase().endsWith(REPLAY_FILE_EXTENSION)) {
        setError(t("invalidFile"));
        return;
      }

      setError(null);
      onFileSelected(file);
    },
    [onFileSelected, t],
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
          aria-label={t("uploadAria")}
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
              {t("dropHere")}
            </p>
            <p className="text-sm text-white/70">{t("orClick")}</p>
          </div>
        </div>

        <div className="flex w-full max-w-md flex-col gap-2">
          <div className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-950/60 p-1.5 ps-2.5 text-[11px] text-white/60">
            <FileVideo className="size-3.5 shrink-0 text-primary" />
            <code
              dir="ltr"
              className="min-w-0 flex-1 break-all text-left font-mono text-white/70"
            >
              {REPLAY_FOLDER}
            </code>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleCopyLocation}
              className="h-7 shrink-0 px-2 text-[11px]"
              aria-label={hasCopied ? t("copiedAria") : t("copyAria")}
            >
              {hasCopied ? (
                <Check className="size-3.5 text-primary" />
              ) : (
                <Copy className="size-3.5" />
              )}
              {hasCopied ? t("copied") : t("copy")}
            </Button>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => !disabled && inputRef.current?.click()}
            disabled={disabled}
          >
            {t("choose")}
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
            {t("where")}
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform",
                isHelpOpen && "rotate-180",
              )}
            />
          </button>

          {isHelpOpen && (
            <div className="mt-3 space-y-2 rounded-md border border-slate-800 bg-slate-950/60 p-3 text-start text-xs leading-relaxed text-white/60">
              <p>
                {t("helpCopyPrefix")}{" "}
                <span className="font-medium text-white/80">{t("copy")}</span>{" "}
                {t("helpCopySuffix")}
              </p>
              <p>{t("helpPaste")}</p>
              <p>
                {t("helpDragPrefix")}{" "}
                <span className="font-medium text-white/80">
                  {t("choose")}
                </span>
                {t("helpDragSuffix")}
              </p>
            </div>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={REPLAY_FILE_EXTENSION}
        aria-label={t("uploadAria")}
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
