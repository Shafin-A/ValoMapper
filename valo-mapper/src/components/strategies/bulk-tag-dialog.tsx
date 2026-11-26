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
import { normalizeStrategyTags } from "@/lib/strategy-library";

interface BulkTagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  availableTags: string[];
  isPending?: boolean;
  onSubmit: (tags: { addTags: string[]; removeTags: string[] }) => void;
}

export const BulkTagDialog = ({
  open,
  onOpenChange,
  selectedCount,
  availableTags,
  isPending = false,
  onSubmit,
}: BulkTagDialogProps) => {
  const t = useTranslations("strategies");
  const addInputRef = useRef<TagInputHandle>(null);
  const removeInputRef = useRef<TagInputHandle>(null);
  const [addTags, setAddTags] = useState<string[]>([]);
  const [removeTags, setRemoveTags] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setAddTags([]);
      setRemoveTags([]);
    }
  }, [open]);

  const handleSubmit = () => {
    const committedAddTags = addInputRef.current?.commit();
    if (committedAddTags === null) {
      return;
    }
    const committedRemoveTags = removeInputRef.current?.commit();
    if (committedRemoveTags === null) {
      return;
    }

    const nextAddTags = normalizeStrategyTags(committedAddTags ?? addTags);
    const nextRemoveTags = normalizeStrategyTags(
      committedRemoveTags ?? removeTags,
    );

    if (nextAddTags.length === 0 && nextRemoveTags.length === 0) {
      onOpenChange(false);
      return;
    }

    onSubmit({
      addTags: nextAddTags,
      removeTags: nextRemoveTags,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("bulkTagsTitle")}</DialogTitle>
          <DialogDescription>
            {t("bulkTagsDescription", { count: selectedCount })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("addTagsLabel")}</p>
            <TagInput
              ref={addInputRef}
              value={addTags}
              onChange={setAddTags}
              availableTags={availableTags.filter(
                (tag) => !removeTags.includes(tag),
              )}
              disabled={isPending}
              placeholder={t("addTagPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">{t("removeTagsLabel")}</p>
            <TagInput
              ref={removeInputRef}
              value={removeTags}
              onChange={setRemoveTags}
              availableTags={availableTags.filter(
                (tag) => !addTags.includes(tag),
              )}
              disabled={isPending}
              placeholder={t("removeTagPlaceholder")}
            />
          </div>
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
          <Button type="button" onClick={handleSubmit} disabled={isPending}>
            {t("applyTags")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
