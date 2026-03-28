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
import React, { useCallback, useRef } from "react";
import type { ImageCanvas } from "@/lib/types";

interface ImageUploadButtonProps extends React.ComponentPropsWithoutRef<
  typeof Button
> {
  mapPosition: Vector2d;
  onImageAdded?: (image: ImageCanvas) => void;
}

export const ImageUploadButton = React.forwardRef<
  HTMLButtonElement,
  ImageUploadButtonProps
>(({ mapPosition, onImageAdded, onClick, ...props }, ref) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setImagesOnCanvas } = useCanvas();

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (
        !ALLOWED_IMAGE_UPLOAD_MIME_TYPES.includes(
          file.type as (typeof ALLOWED_IMAGE_UPLOAD_MIME_TYPES)[number],
        )
      ) {
        toast.error("Unsupported image type. Use JPEG, PNG, GIF, or WEBP.");
        event.target.value = "";
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      let dimensions: { width: number; height: number };

      try {
        dimensions = await new Promise<{ width: number; height: number }>(
          (resolve, reject) => {
            const img = new Image();
            img.onload = () => {
              URL.revokeObjectURL(objectUrl);
              resolve({ width: img.naturalWidth, height: img.naturalHeight });
            };
            img.onerror = () => {
              URL.revokeObjectURL(objectUrl);
              reject(new Error("Failed to load image"));
            };
            img.src = objectUrl;
          },
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Invalid image file");
        event.target.value = "";
        return;
      }

      const { width, height } = dimensions;

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

      const maxSize = 500;
      let scaledWidth = width;
      let scaledHeight = height;

      if (scaledWidth >= scaledHeight && scaledWidth > maxSize) {
        scaledHeight = (scaledHeight * maxSize) / scaledWidth;
        scaledWidth = maxSize;
      } else if (scaledHeight > scaledWidth && scaledHeight > maxSize) {
        scaledWidth = (scaledWidth * maxSize) / scaledHeight;
        scaledHeight = maxSize;
      }

      const newImage: ImageCanvas = {
        id: getNextId("image"),
        src: url,
        x: mapPosition.x + MAP_SIZE / 2 + Math.round(Math.random() * 20),
        y: mapPosition.y + MAP_SIZE / 2 + Math.round(Math.random() * 20),
        width: scaledWidth,
        height: scaledHeight,
      };

      setImagesOnCanvas((prev) => [...prev, newImage]);
      onImageAdded?.(newImage);

      event.target.value = "";
    },
    [mapPosition, onImageAdded, setImagesOnCanvas],
  );

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      if (!event.defaultPrevented) {
        handleUploadClick();
      }
    },
    [onClick, handleUploadClick],
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
        ref={ref}
        variant="ghost"
        size="lg"
        onClick={handleClick}
        {...props}
      >
        <ImageIcon />
      </Button>
    </>
  );
});

ImageUploadButton.displayName = "ImageUploadButton";
