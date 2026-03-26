import { Button } from "@/components/ui/button";
import { Image as ImageIcon } from "lucide-react";
import { useCanvas } from "@/contexts/canvas-context";
import {
  ALLOWED_IMAGE_UPLOAD_MIME_TYPES,
  IMAGE_UPLOAD_ACCEPT_ATTR,
  MAP_SIZE,
} from "@/lib/consts";
import { getNextId } from "@/lib/utils";
import { Vector2d } from "konva/lib/types";
import { toast } from "sonner";
import { useCallback, useRef } from "react";
import type { ImageCanvas } from "@/lib/types";

interface ImageUploadButtonProps {
  mapPosition: Vector2d;
  onImageAdded?: (image: ImageCanvas) => void;
  disabled?: boolean;
}

export const ImageUploadButton = ({
  mapPosition,
  onImageAdded,
  disabled,
}: ImageUploadButtonProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setImagesOnCanvas } = useCanvas();

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const fileType = file.type.toLowerCase();
      if (
        !ALLOWED_IMAGE_UPLOAD_MIME_TYPES.includes(
          fileType as (typeof ALLOWED_IMAGE_UPLOAD_MIME_TYPES)[number],
        )
      ) {
        toast.error("Unsupported image type. Use JPEG, PNG, GIF, or WEBP.");
        event.target.value = "";
        return;
      }

      let url: string;
      try {
        const formData = new FormData();
        formData.append("image", file);
        const response = await fetch("/api/images/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err?.error ?? "Upload failed");
        }

        const data = await response.json();
        url = data.url as string;
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to upload image",
        );
        event.target.value = "";
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);

        const maxSize = 500;
        let width = img.naturalWidth;
        let height = img.naturalHeight;

        if (width >= height && width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        } else if (height > width && height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }

        const newImage: ImageCanvas = {
          id: getNextId("image"),
          src: url,
          x: mapPosition.x + MAP_SIZE / 2 + Math.round(Math.random() * 20),
          y: mapPosition.y + MAP_SIZE / 2 + Math.round(Math.random() * 20),
          width,
          height,
        };

        setImagesOnCanvas((prev) => [...prev, newImage]);
        onImageAdded?.(newImage);

        event.target.value = "";
      };
      img.src = objectUrl;
    },
    [mapPosition, onImageAdded, setImagesOnCanvas],
  );

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={IMAGE_UPLOAD_ACCEPT_ATTR}
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
      <Button
        variant="ghost"
        size="lg"
        onClick={handleUploadClick}
        disabled={disabled}
      >
        <ImageIcon />
      </Button>
    </>
  );
};
