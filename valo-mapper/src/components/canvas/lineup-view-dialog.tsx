import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConnectingLine } from "@/lib/types";
import { LineupFullscreenViewer } from "../tools-sidebar/lineup-dialog/lineup-fullscreen-viewer";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { useCanvas } from "@/contexts/canvas-context";
import { useCollaborativeCanvas } from "@/hooks/use-collaborative-canvas";
import { useWebSocket } from "@/contexts/websocket-context";
import { getYoutubeEmbedUrl } from "@/lib/utils";
import { LineupViewContent } from "./lineup-view-content";
import { LineupEditContent } from "./lineup-edit-content";

interface LineupViewDialogProps {
  line: ConnectingLine | null;
  isOpen: boolean;
  onClose: () => void;
}

export const LineupViewDialog = ({
  line,
  isOpen,
  onClose,
}: LineupViewDialogProps) => {
  const { setConnectingLines, saveCanvasStateAsync } = useCanvas();
  const { notifyConnLineUpdated, notifyLineupWithImagesAdded } =
    useCollaborativeCanvas();

  const { users } = useWebSocket();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);

  const [displayImages, setDisplayImages] = useState<string[]>([]);
  const [displayYoutubeLink, setDisplayYoutubeLink] = useState("");
  const [displayNotes, setDisplayNotes] = useState("");
  const [displayLineColor, setDisplayLineColor] = useState("#ffffff");

  const [editImages, setEditImages] = useState<string[]>([]);
  const [editYoutubeLink, setEditYoutubeLink] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editLineColor, setEditLineColor] = useState("#ffffff");

  useEffect(() => {
    if (line && isOpen) {
      setDisplayImages(line.uploadedImages || []);
      setDisplayYoutubeLink(line.youtubeLink || "");
      setDisplayNotes(line.notes || "");
      setDisplayLineColor(line.strokeColor || "#ffffff");

      setEditImages(line.uploadedImages || []);
      setEditYoutubeLink(line.youtubeLink || "");
      setEditNotes(line.notes || "");
      setEditLineColor(line.strokeColor || "#ffffff");
      setIsEditMode(false);
    }
  }, [line, isOpen]);

  if (!line) return null;

  const hasYoutube = displayYoutubeLink.trim() !== "";
  const youtubeEmbedUrl = hasYoutube
    ? getYoutubeEmbedUrl(displayYoutubeLink)
    : null;
  const isInvalidYoutubeLink = hasYoutube && !youtubeEmbedUrl;

  const isEditEmpty =
    editImages.length === 0 &&
    editYoutubeLink.trim() === "" &&
    editNotes.trim() === "";

  const handleOpenFullscreen = (index: number) => {
    setFullscreenIndex(index);
    setIsFullscreen(true);
  };

  const handleEditClick = () => {
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setEditImages(displayImages);
    setEditYoutubeLink(displayYoutubeLink);
    setEditNotes(displayNotes);
    setEditLineColor(displayLineColor);
    setIsEditMode(false);
  };

  const handleSaveEdit = async () => {
    const updatedLine = {
      ...line,
      uploadedImages: editImages,
      youtubeLink: editYoutubeLink,
      notes: editNotes,
      strokeColor: editLineColor,
    };

    const hasImages = editImages.length > 0;

    if (hasImages) {
      setConnectingLines((prev) =>
        prev.map((l) => (l.id === line.id ? updatedLine : l)),
      );
      if (users.length > 1) {
        await saveCanvasStateAsync();
      }
      notifyLineupWithImagesAdded();
    } else {
      setConnectingLines((prev) =>
        prev.map((l) => (l.id === line.id ? updatedLine : l)),
      );
      notifyConnLineUpdated(updatedLine);
    }

    setDisplayImages(editImages);
    setDisplayYoutubeLink(editYoutubeLink);
    setDisplayNotes(editNotes);
    setDisplayLineColor(editLineColor);
    setIsEditMode(false);
  };

  const handleImagesAdd = (newImages: string[]) => {
    setEditImages((prev) => [...prev, ...newImages]);
  };

  const handleImageRemove = (index: number) => {
    setEditImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClose = () => {
    setIsEditMode(false);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <DialogTitle>
                {isEditMode ? "Edit Lineup" : "Lineup Details"}
              </DialogTitle>
              {!isEditMode && (
                <Button variant="outline" size="sm" onClick={handleEditClick}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
            <DialogDescription className="sr-only">
              {isEditMode
                ? "Edit lineup images, video, and notes"
                : "View lineup images, video, and notes"}
            </DialogDescription>
          </DialogHeader>

          {isEditMode ? (
            <LineupEditContent
              images={editImages}
              youtubeLink={editYoutubeLink}
              notes={editNotes}
              lineColor={editLineColor}
              onImagesAdd={handleImagesAdd}
              onImageRemove={handleImageRemove}
              onImageExpand={handleOpenFullscreen}
              onYoutubeLinkChange={setEditYoutubeLink}
              onNotesChange={setEditNotes}
              onLineColorChange={setEditLineColor}
            />
          ) : (
            <LineupViewContent
              images={displayImages}
              youtubeEmbedUrl={youtubeEmbedUrl}
              youtubeLink={displayYoutubeLink}
              isInvalidYoutubeLink={isInvalidYoutubeLink}
              notes={displayNotes}
              lineColor={displayLineColor}
              onOpenFullscreen={handleOpenFullscreen}
            />
          )}

          {isEditMode && (
            <DialogFooter>
              <Button variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={isEditEmpty}>
                Save
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {(displayImages.length > 0 || editImages.length > 0) && (
        <LineupFullscreenViewer
          images={isEditMode ? editImages : displayImages}
          isOpen={isFullscreen}
          startIndex={fullscreenIndex}
          onClose={() => setIsFullscreen(false)}
        />
      )}
    </>
  );
};
