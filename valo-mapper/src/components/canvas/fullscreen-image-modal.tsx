import Image from "next/image";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface FullscreenImageModalProps {
  imageSrc: string | null;
  onClose: () => void;
}

export const FullscreenImageModal = ({
  imageSrc,
  onClose,
}: FullscreenImageModalProps) => {
  return (
    <Dialog open={!!imageSrc} onOpenChange={(open) => !open && onClose()}>
      <DialogTitle className="sr-only">Fullscreen view</DialogTitle>
      <DialogContent
        className="max-w-[95vw] sm:max-w-[95vw] md:max-w-[95vw] lg:max-w-[95vw] xl:max-w-[95vw] max-h-[95vh] w-auto h-auto border-0 p-0 bg-transparent rounded-none"
        showCloseButton={false}
        onPointerDownOutside={onClose}
        onEscapeKeyDown={onClose}
      >
        {imageSrc && (
          <div className="relative inline-block">
            <Image
              src={imageSrc}
              alt="Fullscreen view"
              width={1920}
              height={1080}
              className="max-w-[95vw] max-h-[95vh] w-auto h-auto object-contain"
              unoptimized
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-2 -right-2 text-white bg-black/50 hover:bg-black/70 rounded-full z-10"
              onClick={onClose}
              aria-label="Close fullscreen"
            >
              <X className="size-5" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
