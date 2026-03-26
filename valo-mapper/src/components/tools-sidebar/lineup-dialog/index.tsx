import { useState } from "react";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AGENTS } from "@/lib/consts";
import { getNextId } from "@/lib/utils";
import { useCanvas } from "@/contexts/canvas-context";
import { useCollaborativeCanvas } from "@/hooks/use-collaborative-canvas";
import { ABILITY_LOOKUP } from "@/lib/consts/configs/agent-icon/consts";
import { Vector2d } from "konva/lib/types";
import { MAP_SIZE } from "@/lib/consts";

import { LineupFormFields } from "./lineup-form-fields";
import { LineupFullscreenViewer } from "./lineup-fullscreen-viewer";
import { useLineupForm } from "@/hooks/use-lineup-form";

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);

  const {
    setAgentsOnCanvas,
    setAbilitiesOnCanvas,
    setConnectingLines,
    isAlly,
  } = useCanvas();

  const { notifyAgentAdded, notifyAbilityAdded, notifyConnLineAdded } =
    useCollaborativeCanvas();

  const {
    selectedAgent,
    selectedAbility,
    uploadedImages,
    youtubeLink,
    notes,
    lineColor,
    setSelectedAbility,
    setUploadedImages,
    setYoutubeLink,
    setNotes,
    debouncedSetLineColor,
    handleAgentChange,
    handleRemoveImage,
    resetForm,
    isFormValid,
  } = useLineupForm();

  const handleConfirm = async () => {
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

    const newAgent = {
      id: agentId,
      name: agent.name,
      role: agent.role,
      isAlly,
      x: agentX,
      y: agentY,
    };

    const newAbility = {
      id: abilityId,
      name: abilityConfig.name,
      action: abilityConfig.action,
      src: abilityConfig.src,
      isAlly,
      x: abilityX,
      y: abilityY,
    };

    const newConnectingLine = {
      id: getNextId("ability"),
      fromId: agentId,
      toId: abilityId,
      strokeColor: lineColor,
      strokeWidth: 8,
      uploadedImages,
      youtubeLink,
      notes,
    };

    setAgentsOnCanvas((prev) => [...prev, newAgent]);
    setAbilitiesOnCanvas((prev) => [...prev, newAbility]);
    setConnectingLines((prev) => [...prev, newConnectingLine]);

    notifyAgentAdded(newAgent);
    notifyAbilityAdded(newAbility);
    notifyConnLineAdded(newConnectingLine);

    if (onConfirm) {
      onConfirm(selectedAgent, selectedAbility);
    }

    resetForm();
  };

  const handleCancel = () => {
    resetForm();
    if (onCancel) {
      onCancel();
    }
  };

  const handleOpenFullscreen = (index: number) => {
    setFullscreenIndex(index);
    setIsFullscreen(true);
  };

  const handleImagesAdd = (newImages: string[]) => {
    setUploadedImages((prev) => [...prev, ...newImages]);
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
        <LineupFormFields
          selectedAgent={selectedAgent}
          selectedAbility={selectedAbility}
          youtubeLink={youtubeLink}
          notes={notes}
          lineColor={lineColor}
          onAgentChange={handleAgentChange}
          onAbilityChange={setSelectedAbility}
          onYoutubeLinkChange={setYoutubeLink}
          onNotesChange={setNotes}
          onLineColorChange={debouncedSetLineColor}
          uploadedImages={uploadedImages}
          onImagesAdd={handleImagesAdd}
          onImageRemove={handleRemoveImage}
          onImageExpand={handleOpenFullscreen}
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} disabled={!isFormValid()}>
          Confirm
        </Button>
      </DialogFooter>

      <LineupFullscreenViewer
        images={uploadedImages}
        isOpen={isFullscreen}
        startIndex={fullscreenIndex}
        onClose={() => setIsFullscreen(false)}
      />
    </DialogContent>
  );
};
