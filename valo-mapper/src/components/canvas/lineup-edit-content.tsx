import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LineupImageUpload } from "../tools-sidebar/lineup-dialog/lineup-image-upload";
import { debounce } from "@/lib/utils";
import { useMemo } from "react";
import { useTranslations } from "next-intl";

interface LineupEditContentProps {
  images: string[];
  youtubeLink: string;
  notes: string;
  lineColor: string;
  onImagesAdd: (newImages: string[]) => void;
  onImageRemove: (index: number) => void;
  onImageExpand: (index: number) => void;
  onYoutubeLinkChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onLineColorChange: (value: string) => void;
}

export const LineupEditContent = ({
  images,
  youtubeLink,
  notes,
  lineColor,
  onImagesAdd,
  onImageRemove,
  onImageExpand,
  onYoutubeLinkChange,
  onNotesChange,
  onLineColorChange,
}: LineupEditContentProps) => {
  const t = useTranslations("canvas.lineup");
  const debouncedSetLineColor = useMemo(
    () => debounce((color: string) => onLineColorChange(color), 16),
    [onLineColorChange],
  );

  return (
    <div className="space-y-4 py-4">
      <LineupImageUpload
        images={images}
        onImagesAdd={onImagesAdd}
        onImageRemove={onImageRemove}
        onImageExpand={onImageExpand}
      />
      <div className="space-y-2">
        <Label htmlFor="edit-link">{t("link")}</Label>
        <Input
          id="edit-link"
          type="url"
          placeholder="https://example.com/..."
          value={youtubeLink}
          onChange={(e) => onYoutubeLinkChange(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-notes">{t("notes")}</Label>
        <Textarea
          id="edit-notes"
          placeholder={t("notesPlaceholder")}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-line-color">{t("lineColor")}</Label>
        <div className="flex items-center gap-3">
          <input
            id="edit-line-color"
            type="color"
            value={lineColor}
            onChange={(e) => debouncedSetLineColor(e.target.value)}
            className="h-6 w-6 cursor-pointer rounded"
          />
        </div>
      </div>
    </div>
  );
};
