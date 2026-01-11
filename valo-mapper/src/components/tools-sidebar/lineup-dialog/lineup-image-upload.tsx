import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X, Expand } from "lucide-react";
import Image from "next/image";
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

  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const fileArray = Array.from(files);
      const readers = fileArray.map((file) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(file);
        });
      });

      Promise.all(readers).then((newImages) => {
        onImagesAdd(newImages);
      });
    }
  };

  return (
    <div className="space-y-2">
      <Label>Lineup Images</Label>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
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
          >
            <Upload className="h-4 w-4 mr-2" />
            Add More Images
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          className="w-full h-32 border-dashed"
          onClick={handleImageUpload}
        >
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Upload className="h-8 w-8" />
            <span className="text-sm">Click to upload lineup images</span>
          </div>
        </Button>
      )}
    </div>
  );
};
