"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import {
  TagInput,
  type TagInputHandle,
} from "@/components/strategies/tag-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MAX_STRATEGY_TAGS,
  MAX_STRATEGY_TAG_LENGTH,
  normalizeStrategyTags,
  validateStrategyTags,
} from "@/lib/strategy-library";

interface TagEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strategyName: string;
  initialTags: string[];
  availableTags: string[];
  isPending?: boolean;
  onSave: (tags: string[]) => void;
}

export const TagEditorDialog = ({
  open,
  onOpenChange,
  strategyName,
  initialTags,
  availableTags,
  isPending = false,
  onSave,
}: TagEditorDialogProps) => {
  const t = useTranslations("strategies");
  const tagInputRef = useRef<TagInputHandle>(null);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTags(initialTags);
      setError(null);
    }
  }, [initialTags, open]);

  const handleSave = () => {
    const committedTags = tagInputRef.current?.commit();
    if (committedTags === null) {
      return;
    }

    const nextTags = committedTags ?? tags;
    const validationError = validateStrategyTags(nextTags);
    if (validationError) {
      setError(
        validationError === "tooMany"
          ? t("tagTooMany", { max: MAX_STRATEGY_TAGS })
          : t("tagInvalid", { maxLength: MAX_STRATEGY_TAG_LENGTH }),
      );
      return;
    }
    onSave(normalizeStrategyTags(nextTags));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("editTagsTitle")}</DialogTitle>
          <DialogDescription>
            {t("editTagsDescription", { name: strategyName })}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <TagInput
            ref={tagInputRef}
            value={tags}
            onChange={setTags}
            availableTags={availableTags}
            disabled={isPending}
          />
          {error && (
            <p className="mt-2 text-xs text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {t("cancel")}
          </Button>
          <Button type="button" onClick={handleSave} disabled={isPending}>
            {t("saveTags")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
