"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCanvasEntities, useCanvasUi } from "@/contexts/canvas-context";
import { useNoteEditor } from "@/hooks/canvas";
import {
  getCanvasItemNoteLabel,
  normalizeNote,
} from "@/lib/canvas-note";
import { getCanvasItemInstance } from "@/lib/canvas-selection";
import { NOTE_MAX_LENGTH } from "@/lib/consts";
import type { CanvasSelectionItem } from "@/lib/types";
import { MessageSquare, Trash2 } from "lucide-react";
import { memo, useCallback, useState } from "react";
import type { KeyboardEvent } from "react";

interface NoteEditorContentProps {
  target: CanvasSelectionItem;
  label: string;
  initialNote: string;
  onClose: () => void;
}

const NoteEditorContent = ({
  target,
  label,
  initialNote,
  onClose,
}: NoteEditorContentProps) => {
  const { updateNote } = useNoteEditor();
  const [value, setValue] = useState(initialNote);

  const trimmedValue = value.trim();
  const hasExistingNote = initialNote.trim().length > 0;
  const initialNormalizedNote = normalizeNote(initialNote);

  const handleSave = useCallback(() => {
    const nextNote = normalizeNote(value);

    if (nextNote !== initialNormalizedNote) {
      updateNote(target, nextNote);
    }

    onClose();
  }, [initialNormalizedNote, onClose, target, updateNote, value]);

  const handleRemove = useCallback(() => {
    updateNote(target, undefined);
    onClose();
  }, [onClose, target, updateNote]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        if (trimmedValue.length > 0) {
          handleSave();
        }
      }
    },
    [handleSave, trimmedValue],
  );

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] min-w-0 overflow-x-hidden overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="size-4" />
            {hasExistingNote ? "Edit note" : "Add note"}
          </DialogTitle>
          <DialogDescription className="break-words">
            Add context to {label}. Everyone in this lobby sees it when hovering
            over the element.
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-2">
          <Label htmlFor="canvas-note">Note</Label>
          <Textarea
            id="canvas-note"
            value={value}
            rows={5}
            maxLength={NOTE_MAX_LENGTH}
            placeholder="Add a note for this element..."
            autoFocus
            className="max-h-[40dvh] min-h-24 min-w-0 resize-none overflow-y-auto [overflow-wrap:anywhere]"
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          <p className="text-right text-xs text-muted-foreground">
            {value.length}/{NOTE_MAX_LENGTH}
          </p>
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button
            variant="destructiveGhost"
            className="mr-auto"
            onClick={handleRemove}
            disabled={!hasExistingNote}
          >
            <Trash2 />
            Remove
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={trimmedValue.length === 0}>
            Save note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const NoteEditorDialog = memo(function NoteEditorDialog() {
  const { editingNoteTarget, setEditingNoteTarget } = useCanvasUi();
  const entities = useCanvasEntities();

  const closeEditor = useCallback(() => {
    setEditingNoteTarget(null);
  }, [setEditingNoteTarget]);

  const entry = editingNoteTarget
    ? getCanvasItemInstance(entities, editingNoteTarget)
    : null;

  if (!editingNoteTarget || !entry) {
    return null;
  }

  return (
    <NoteEditorContent
      key={`${editingNoteTarget.type}:${editingNoteTarget.id}`}
      target={editingNoteTarget}
      label={getCanvasItemNoteLabel(entry)}
      initialNote={entry.item.note ?? ""}
      onClose={closeEditor}
    />
  );
});
