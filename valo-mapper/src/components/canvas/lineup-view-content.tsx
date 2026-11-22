import { Label } from "@/components/ui/label";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { Expand } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ensureAbsoluteUrl } from "@/lib/url";

interface LineupViewContentProps {
  images: string[];
  youtubeEmbedUrl: string | null;
  youtubeLink: string;
  isInvalidYoutubeLink: boolean;
  notes: string;
  lineColor: string;
  onOpenFullscreen: (index: number) => void;
}

export const LineupViewContent = ({
  images,
  youtubeEmbedUrl,
  youtubeLink,
  isInvalidYoutubeLink,
  notes,
  lineColor,
  onOpenFullscreen,
}: LineupViewContentProps) => {
  const t = useTranslations("canvas.lineup");
  const hasImages = images.length > 0;
  const hasYoutube = youtubeLink.trim() !== "";
  const hasNotes = notes.trim() !== "";

  return (
    <div className="space-y-4 py-4">
      {hasImages && (
        <div className="space-y-2">
          <Label>{t("lineupImages")}</Label>
          <div className="relative px-12">
            <Carousel className="w-full">
              <CarouselContent>
                {images.map((image, index) => (
                  <CarouselItem key={index}>
                    <div className="relative w-full aspect-video rounded-md border overflow-hidden bg-muted">
                      <Image
                        src={image}
                        alt={t("imageAlt", { index: index + 1 })}
                        fill
                        className="object-contain"
                      />
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute top-2 left-2 h-6 w-6"
                        aria-label={t("viewImageFullscreen", {
                          index: index + 1,
                        })}
                        onClick={() => onOpenFullscreen(index)}
                      >
                        <Expand className="h-4 w-4" />
                      </Button>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-0" />
              <CarouselNext className="right-0" />
            </Carousel>
          </div>
        </div>
      )}

      {hasYoutube && youtubeEmbedUrl && (
        <div className="space-y-2">
          <Label>{t("youtubeVideo")}</Label>
          <div className="w-full aspect-video rounded-md border overflow-hidden bg-muted">
            <iframe
              src={youtubeEmbedUrl}
              title={t("youtubePlayer")}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        </div>
      )}

      {isInvalidYoutubeLink && (
        <div className="space-y-2">
          <Label>{t("link")}</Label>
          <div className="p-3 rounded-md border bg-muted/50">
            <a
              href={ensureAbsoluteUrl(youtubeLink)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline break-all"
            >
              {youtubeLink}
            </a>
            <p className="text-xs text-muted-foreground mt-1">
              {t("openLinkNewTab")}
            </p>
          </div>
        </div>
      )}

      {hasNotes && (
        <div className="space-y-2">
          <Label>{t("notes")}</Label>
          <div className="p-3 rounded-md border bg-muted/50 whitespace-pre-wrap">
            {notes}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>{t("lineColor")}</Label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={lineColor}
            aria-label={t("lineColor")}
            className="h-6 w-6 rounded"
            disabled
          />
        </div>
      </div>

      {!hasImages && !hasYoutube && !hasNotes && (
        <div className="text-center text-muted-foreground py-8">
          {t("noDetails")}
        </div>
      )}
    </div>
  );
};
