import { useState, useRef, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AGENTS, AGENT_ICON_CONFIGS } from "@/lib/consts";
import Image from "next/image";
import { getAgentImgSrc, getNextId, debounce } from "@/lib/utils";
import { Upload, X, Expand } from "lucide-react";
import { useCanvas } from "@/contexts/canvas-context";
import { ABILITY_LOOKUP } from "@/lib/consts/configs/agent-icon/consts";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Textarea } from "../ui/textarea";
import { Vector2d } from "konva/lib/types";
import { MAP_SIZE } from "@/lib/consts";

interface LineupDialogProps {
  onConfirm?: (agentName: string, abilityName: string) => void;
  onCancel?: () => void;
  mapPosition: Vector2d;
}

export const LineupDialog = ({
  onConfirm,
  onCancel,
  mapPosition,
}: LineupDialogProps) => {
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [selectedAbility, setSelectedAbility] = useState<string>("");
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);
  const [youtubeLink, setYoutubeLink] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [lineColor, setLineColor] = useState<string>("#ffffff");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    setAgentsOnCanvas,
    setAbilitiesOnCanvas,
    setConnectingLines,
    isAlly,
  } = useCanvas();

  const debouncedSetLineColor = useMemo(
    () => debounce((color: string) => setLineColor(color), 16),
    []
  );

  const handleConfirm = () => {
    if (!selectedAgent || !selectedAbility) return;

    const agent = AGENTS.find((a) => a.name === selectedAgent);
    const abilityConfig = ABILITY_LOOKUP[selectedAbility];

    if (!agent || !abilityConfig) return;

    const agentId = getNextId("agent");
    const abilityId = getNextId("ability");

    const agentX =
      mapPosition.x + MAP_SIZE / 2 + Math.round(Math.random() * 20);
    const agentY =
      mapPosition.y + MAP_SIZE / 2 + Math.round(Math.random() * 20);
    const abilityX = agentX + 150;
    const abilityY = agentY;

    setAgentsOnCanvas((prev) => [
      ...prev,
      {
        id: agentId,
        name: agent.name,
        role: agent.role,
        isAlly,
        x: agentX,
        y: agentY,
      },
    ]);

    setAbilitiesOnCanvas((prev) => [
      ...prev,
      {
        id: abilityId,
        name: abilityConfig.name,
        action: abilityConfig.action,
        isAlly,
        x: abilityX,
        y: abilityY,
      },
    ]);

    setConnectingLines((prev) => [
      ...prev,
      {
        id: getNextId("ability"),
        fromId: agentId,
        toId: abilityId,
        strokeColor: lineColor,
        strokeWidth: 8,
      },
    ]);

    if (onConfirm) {
      onConfirm(selectedAgent, selectedAbility);
    }

    setSelectedAgent("");
    setSelectedAbility("");
    setUploadedImages([]);
    setYoutubeLink("");
    setNotes("");
    setLineColor("#ffffff");
  };

  const handleCancel = () => {
    setSelectedAgent("");
    setSelectedAbility("");
    setUploadedImages([]);
    setYoutubeLink("");
    setNotes("");
    setLineColor("#ffffff");
    if (onCancel) {
      onCancel();
    }
  };

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

      Promise.all(readers).then((images) => {
        setUploadedImages((prev) => [...prev, ...images]);
      });
    }
  };

  const handleRemoveImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOpenFullscreen = (index: number) => {
    setFullscreenIndex(index);
    setIsFullscreen(true);
  };

  const availableAbilities = selectedAgent
    ? AGENT_ICON_CONFIGS[selectedAgent] || []
    : [];

  const handleAgentChange = (agentName: string) => {
    setSelectedAgent(agentName);
    setSelectedAbility("");
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Add Lineup</DialogTitle>
        <DialogDescription className="sr-only">
          Add a new Lineup
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="agent-select">Agent</Label>
          <Select value={selectedAgent} onValueChange={handleAgentChange}>
            <SelectTrigger id="agent-select" className="w-full">
              <SelectValue placeholder="Select an agent" />
            </SelectTrigger>
            <SelectContent className="w-full">
              {AGENTS.map((agent) => (
                <SelectItem key={agent.name} value={agent.name}>
                  <div className="flex items-center gap-2">
                    <Image
                      src={getAgentImgSrc(agent.name)}
                      alt={agent.name}
                      width={24}
                      height={24}
                      className="rounded"
                    />
                    <span>{agent.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ability-select">Ability</Label>
          <Select
            value={selectedAbility}
            onValueChange={setSelectedAbility}
            disabled={!selectedAgent}
          >
            <SelectTrigger id="ability-select" className="w-full">
              <SelectValue placeholder="Select an ability" />
            </SelectTrigger>
            <SelectContent className="w-full">
              {availableAbilities.map((ability) => (
                <SelectItem key={ability.id} value={ability.name}>
                  <div className="flex items-center gap-2">
                    <Image
                      src={ability.src}
                      alt={ability.name}
                      width={24}
                      height={24}
                      className="rounded"
                    />
                    <span>{ability.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
          {uploadedImages.length > 0 ? (
            <div className="space-y-2">
              <div className="relative px-12">
                <Carousel className="w-full">
                  <CarouselContent>
                    {uploadedImages.map((image, index) => (
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
                            onClick={() => handleOpenFullscreen(index)}
                          >
                            <Expand className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-6 w-6"
                            onClick={() => handleRemoveImage(index)}
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
        <div className="space-y-2">
          <Label htmlFor="youtube-link">YouTube Link</Label>
          <Input
            id="youtube-link"
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            value={youtubeLink}
            onChange={(e) => setYoutubeLink(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            placeholder="Add any notes about this lineup..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="line-color">Line Color</Label>
          <div className="flex items-center gap-3">
            <input
              id="line-color"
              type="color"
              value={lineColor}
              onChange={(e) => debouncedSetLineColor(e.target.value)}
              className="h-6 w-6 cursor-pointer rounded"
            />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={
            !selectedAgent ||
            !selectedAbility ||
            (uploadedImages.length === 0 &&
              youtubeLink.trim() === "" &&
              notes.trim() === "")
          }
        >
          Confirm
        </Button>
      </DialogFooter>

      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogTitle className="sr-only">Fullscreen view</DialogTitle>
        <DialogDescription className="sr-only">
          View lineup images in fullscreen mode
        </DialogDescription>
        <DialogContent
          className="max-w-[95vw] sm:max-w-[95vw] md:max-w-[95vw] lg:max-w-[95vw] xl:max-w-[95vw] max-h-[95vh] w-auto h-auto border-0 p-0 bg-transparent rounded-none"
          showCloseButton={false}
          onPointerDownOutside={() => setIsFullscreen(false)}
          onEscapeKeyDown={() => setIsFullscreen(false)}
        >
          <div className="relative w-[95vw] h-[95vh] flex items-center justify-center">
            <Carousel
              className="w-full h-full"
              opts={{ startIndex: fullscreenIndex }}
            >
              <CarouselContent className="h-full">
                {uploadedImages.map((image, index) => (
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
              onClick={() => setIsFullscreen(false)}
              aria-label="Close fullscreen"
            >
              <X className="size-5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DialogContent>
  );
};
