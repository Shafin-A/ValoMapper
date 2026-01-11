import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LineupImageUpload } from "../tools-sidebar/lineup-dialog/lineup-image-upload";
import { debounce } from "@/lib/utils";
import { useMemo } from "react";

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
  const debouncedSetLineColor = useMemo(
    () => debounce((color: string) => onLineColorChange(color), 16),
    [onLineColorChange]
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
        <Label htmlFor="edit-youtube-link">YouTube Link</Label>
        <Input
          id="edit-youtube-link"
          type="url"
          placeholder="https://www.youtube.com/watch?v=..."
          value={youtubeLink}
          onChange={(e) => onYoutubeLinkChange(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-notes">Notes</Label>
        <Textarea
          id="edit-notes"
          placeholder="Add any notes about this lineup..."
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-line-color">Line Color</Label>
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
