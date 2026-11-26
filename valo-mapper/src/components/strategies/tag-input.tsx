"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useState,
  type KeyboardEvent,
} from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  isStrategyTagValid,
  MAX_STRATEGY_TAGS,
  MAX_STRATEGY_TAG_LENGTH,
  normalizeStrategyTag,
  normalizeStrategyTags,
} from "@/lib/strategy-library";

export type TagInputHandle = {
  /**
   * Commits the text currently in the input. Returns the resulting tag list,
   * or null when the pending text is invalid.
   */
  commit: () => string[] | null;
};

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  availableTags?: string[];
  disabled?: boolean;
  placeholder?: string;
  maxTags?: number;
  ariaLabel?: string;
}

type TagAdditionResult = {
  nextTags: string[];
  error: "tooMany" | "invalid" | null;
  added: boolean;
};

export const TagInput = forwardRef<TagInputHandle, TagInputProps>(
  function TagInput(
    {
      value,
      onChange,
      availableTags = [],
      disabled = false,
      placeholder,
      maxTags = MAX_STRATEGY_TAGS,
      ariaLabel,
    },
    ref,
  ) {
    const t = useTranslations("strategies");
    const [input, setInput] = useState("");
    const [error, setError] = useState<"tooMany" | "invalid" | null>(null);

    const suggestions = useMemo(() => {
      const query = normalizeStrategyTag(input);
      return availableTags
        .filter((tag) => !value.includes(tag))
        .filter((tag) => (query ? tag.includes(query) : true))
        .slice(0, query ? 6 : 8);
    }, [availableTags, input, value]);

    const resolveAddition = (raw: string): TagAdditionResult => {
      const tag = normalizeStrategyTag(raw);
      if (!tag) {
        return { nextTags: value, error: null, added: false };
      }
      if (!isStrategyTagValid(tag)) {
        return { nextTags: value, error: "invalid", added: false };
      }
      if (value.includes(tag)) {
        return { nextTags: value, error: null, added: false };
      }
      if (value.length >= maxTags) {
        return { nextTags: value, error: "tooMany", added: false };
      }
      return {
        nextTags: normalizeStrategyTags([...value, tag]),
        error: null,
        added: true,
      };
    };

    const addTag = (raw: string) => {
      const result = resolveAddition(raw);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.added) {
        onChange(result.nextTags);
      }
      setInput("");
      setError(null);
    };

    const commit = (): string[] | null => {
      const result = resolveAddition(input);
      if (result.error) {
        setError(result.error);
        return null;
      }
      if (result.added) {
        onChange(result.nextTags);
      }
      if (result.added || normalizeStrategyTag(input)) {
        setInput("");
        setError(null);
      }
      return result.nextTags;
    };

    useImperativeHandle(ref, () => ({ commit }));

    const removeTag = (tag: string) => {
      onChange(value.filter((valueTag) => valueTag !== tag));
      setError(null);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter" || event.key === ",") {
        event.preventDefault();
        addTag(input);
        return;
      }
      if (event.key === "Backspace" && input.length === 0 && value.length > 0) {
        removeTag(value[value.length - 1]);
      }
    };

    return (
      <div className="space-y-2">
        <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-2 py-1.5 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
          {value.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="gap-1 py-1 text-[11px]"
            >
              <span className="max-w-32 truncate">{tag}</span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => removeTag(tag)}
                aria-label={t("removeTag", { tag })}
                className="rounded-full text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
          <Input
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            disabled={disabled || value.length >= maxTags}
            placeholder={
              value.length >= maxTags
                ? t("tagLimitReached", { max: maxTags })
                : (placeholder ?? t("tagPlaceholder"))
            }
            aria-label={ariaLabel ?? t("tagPlaceholder")}
            className="h-7 min-w-28 flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
          />
        </div>

        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span>{t("tagCount", { count: value.length, max: maxTags })}</span>
          <span>{t("tagHint", { maxLength: MAX_STRATEGY_TAG_LENGTH })}</span>
        </div>

        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((tag) => (
              <Button
                key={tag}
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || value.length >= maxTags}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => addTag(tag)}
                className="h-7 rounded-full px-2 text-[11px]"
              >
                {tag}
              </Button>
            ))}
          </div>
        )}

        {error && (
          <p className="text-xs text-destructive" role="alert">
            {error === "tooMany"
              ? t("tagTooMany", { max: maxTags })
              : t("tagInvalid", { maxLength: MAX_STRATEGY_TAG_LENGTH })}
          </p>
        )}
      </div>
    );
  },
);
