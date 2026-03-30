import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ZoomIn, ZoomOut, RefreshCw } from "lucide-react";

interface FullscreenImageModalProps {
  imageSrc: string | null;
  onClose: () => void;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;

export const FullscreenImageModal = ({
  imageSrc,
  onClose,
}: FullscreenImageModalProps) => {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setDragStart(null);
  }, [imageSrc]);

  const canZoomIn = zoom < MAX_ZOOM;
  const canZoomOut = zoom > MIN_ZOOM;

  const imageStyle = useMemo(
    () => ({
      transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
      transformOrigin: "center center",
      transition: dragStart ? "none" : "transform 0.15s ease",
      display: "inline-block",
      cursor: dragStart ? "grabbing" : "grab",
    }),
    [offset, zoom, dragStart],
  );

  const applyZoom = (nextZoom: number, focusX: number, focusY: number) => {
    const center = calculateCenter();
    const dx = focusX - center.x;
    const dy = focusY - center.y;

    setOffset((prev) => ({
      x: prev.x + dx * (1 / nextZoom - 1 / zoom),
      y: prev.y + dy * (1 / nextZoom - 1 / zoom),
    }));
    setZoom(nextZoom);
  };

  const calculateCenter = () => {
    if (!containerRef.current) {
      return { x: 0, y: 0 };
    }
    const rect = containerRef.current.getBoundingClientRect();
    return { x: rect.width / 2, y: rect.height / 2 };
  };

  const handleZoomIn = () => {
    const nextZoom = Math.min(zoom + ZOOM_STEP, MAX_ZOOM);
    if (nextZoom === zoom) return;
    const center = calculateCenter();
    applyZoom(nextZoom, center.x, center.y);
  };

  const handleZoomOut = () => {
    const nextZoom = Math.max(zoom - ZOOM_STEP, MIN_ZOOM);
    if (nextZoom === zoom) return;
    const center = calculateCenter();
    applyZoom(nextZoom, center.x, center.y);
  };

  const handleZoomReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    if (typeof event.currentTarget.setPointerCapture === "function") {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    setDragStart({ x: event.clientX, y: event.clientY });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart) return;
    event.preventDefault();
    const deltaX = event.clientX - dragStart.x;
    const deltaY = event.clientY - dragStart.y;

    const panScale = 1 / Math.sqrt(zoom);

    setDragStart({ x: event.clientX, y: event.clientY });
    setOffset((prev) => ({
      x: prev.x + deltaX * panScale,
      y: prev.y + deltaY * panScale,
    }));
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (typeof event.currentTarget.releasePointerCapture === "function") {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragStart(null);
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!imageSrc) return;
    event.preventDefault();

    const direction = event.deltaY > 0 ? -1 : 1;
    const nextZoom = Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, zoom + direction * ZOOM_STEP),
    );
    if (nextZoom === zoom) return;

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;
      applyZoom(nextZoom, pointerX, pointerY);
      return;
    }

    setZoom(nextZoom);
  };

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
          <div
            ref={containerRef}
            data-testid="fullscreen-container"
            className="relative w-[95vw] h-[95vh] max-w-[95vw] max-h-[95vh]"
          >
            <div className="absolute inset-x-2 top-2 z-30 flex items-center justify-between rounded p-1 pointer-events-none">
              <div className="flex gap-1 pointer-events-auto">
                <Button
                  variant="outline"
                  size="icon"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={handleZoomOut}
                  disabled={!canZoomOut}
                  aria-label="Zoom out"
                  data-testid="zoom-out"
                >
                  <ZoomOut className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={handleZoomReset}
                  aria-label="Reset zoom"
                  data-testid="zoom-reset"
                >
                  <RefreshCw className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={handleZoomIn}
                  disabled={!canZoomIn}
                  aria-label="Zoom in"
                  data-testid="zoom-in"
                >
                  <ZoomIn className="size-4" />
                </Button>
              </div>
              <div className="pointer-events-auto">
                <Button
                  variant="outline"
                  size="icon"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={onClose}
                  aria-label="Close fullscreen"
                  data-testid="close-fullscreen"
                >
                  <X className="size-5" />
                </Button>
              </div>
            </div>

            <div className="relative w-full h-full overflow-hidden pt-10">
              <div
                className="absolute inset-0 flex items-center justify-center select-none"
                onMouseDown={(event) => event.preventDefault()}
                onWheel={handleWheel}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={() => setDragStart(null)}
                onPointerLeave={() => setDragStart(null)}
              >
                <div
                  style={imageStyle}
                  className="inline-flex items-center justify-center select-none"
                >
                  <Image
                    src={imageSrc}
                    alt="Fullscreen view"
                    width={1920}
                    height={1080}
                    className="max-w-[95vw] max-h-[95vh] w-auto h-auto object-contain"
                    unoptimized
                    draggable={false}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
