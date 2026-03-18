import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  ALLOWED_IMAGE_UPLOAD_MIME_TYPES,
  IMAGE_UPLOAD_ACCEPT_ATTR,
} from "@/lib/consts";
import { Upload, X, Expand, Loader2 } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface LineupImageUploadProps {
  images: string[];
  onImagesAdd: (images: string[]) => void;
  onImageRemove: (index: number) => void;
  onImageExpand: (index: number) => void;
}

export const LineupImageUpload = ({
  images,
  onImagesAdd,
  onImageRemove,
  onImageExpand,
}: LineupImageUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const validFiles = fileArray.filter((file) =>
      ALLOWED_IMAGE_UPLOAD_MIME_TYPES.includes(
        file.type.toLowerCase() as (typeof ALLOWED_IMAGE_UPLOAD_MIME_TYPES)[number],
      ),
    );

    if (validFiles.length !== fileArray.length) {
      toast.error(
        "Some files were skipped. Allowed types: JPEG, PNG, GIF, WEBP.",
      );
    }

    if (validFiles.length === 0) {
      event.target.value = "";
      return;
    }

    setIsUploading(true);
    try {
      const uploads = validFiles.map(async (file) => {
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
        return data.url as string;
      });

      const urls = await Promise.all(uploads);
      onImagesAdd(urls);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to upload images",
      );
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <Label>Lineup Images</Label>
      <input
        ref={fileInputRef}
        type="file"
        accept={IMAGE_UPLOAD_ACCEPT_ATTR}
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
      {images.length > 0 ? (
        <div className="space-y-2">
          <div className="relative px-12">
            <Carousel className="w-full">
              <CarouselContent>
                {images.map((image, index) => (
                  <CarouselItem key={index}>
                    <div className="relative w-full aspect-video rounded-md border overflow-hidden bg-muted">
                      <Image
                        src={image}
                        alt={`Lineup ${index + 1}`}
                        fill
                        className="object-contain"
                      />
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute top-2 left-2 h-6 w-6"
                        onClick={() => onImageExpand(index)}
                      >
                        <Expand className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={() => onImageRemove(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-0" />
              <CarouselNext className="right-0" />
            </Carousel>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleImageUpload}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {isUploading ? "Uploading…" : "Add More Images"}
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          className="w-full h-32 border-dashed"
          onClick={handleImageUpload}
          disabled={isUploading}
        >
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            {isUploading ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <Upload className="h-8 w-8" />
            )}
            <span className="text-sm">
              {isUploading ? "Uploading…" : "Click to upload lineup images"}
            </span>
          </div>
        </Button>
      )}
    </div>
  );
};
