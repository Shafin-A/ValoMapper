import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { X } from "lucide-react";
import Image from "next/image";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface LineupFullscreenViewerProps {
  images: string[];
  isOpen: boolean;
  startIndex: number;
  onClose: () => void;
}

export const LineupFullscreenViewer = ({
  images,
  isOpen,
  startIndex,
  onClose,
}: LineupFullscreenViewerProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogTitle className="sr-only">Fullscreen view</DialogTitle>
      <DialogDescription className="sr-only">
        View lineup images in fullscreen mode
      </DialogDescription>
      <DialogContent
        className="max-w-[95vw] sm:max-w-[95vw] md:max-w-[95vw] lg:max-w-[95vw] xl:max-w-[95vw] max-h-[95vh] w-auto h-auto border-0 p-0 bg-transparent rounded-none"
        showCloseButton={false}
        onPointerDownOutside={onClose}
        onEscapeKeyDown={onClose}
      >
        <div className="relative w-[95vw] h-[95vh] flex items-center justify-center">
          <Carousel className="w-full h-full" opts={{ startIndex }}>
            <CarouselContent className="h-full">
              {images.map((image, index) => (
                <CarouselItem
                  key={index}
                  className="flex items-center justify-center h-full"
                >
                  <Image
                    src={image}
                    alt={`Lineup ${index + 1}`}
                    width={1920}
                    height={1080}
                    className="max-w-[95vw] max-h-[95vh] w-auto h-auto object-contain"
                    unoptimized
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-4 text-white bg-black/50 hover:bg-black/70" />
            <CarouselNext className="right-4 text-white bg-black/50 hover:bg-black/70" />
          </Carousel>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 rounded-full z-10"
            onClick={onClose}
            aria-label="Close fullscreen"
          >
            <X className="size-5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
