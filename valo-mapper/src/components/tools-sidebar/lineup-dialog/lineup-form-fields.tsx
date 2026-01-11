import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AGENTS, AGENT_ICON_CONFIGS } from "@/lib/consts";
import { getAgentImgSrc } from "@/lib/utils";
import Image from "next/image";
import { LineupImageUpload } from "./lineup-image-upload";

interface LineupFormFieldsProps {
  selectedAgent: string;
  selectedAbility: string;
  youtubeLink: string;
  notes: string;
  lineColor: string;
  onAgentChange: (value: string) => void;
  onAbilityChange: (value: string) => void;
  onYoutubeLinkChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onLineColorChange: (value: string) => void;
  uploadedImages: string[];
  onImagesAdd: (images: string[]) => void;
  onImageRemove: (index: number) => void;
  onImageExpand: (index: number) => void;
}

export const LineupFormFields = ({
  selectedAgent,
  selectedAbility,
  youtubeLink,
  notes,
  lineColor,
  onAgentChange,
  onAbilityChange,
  onYoutubeLinkChange,
  onNotesChange,
  onLineColorChange,
  uploadedImages,
  onImagesAdd,
  onImageRemove,
  onImageExpand,
}: LineupFormFieldsProps) => {
  const availableAbilities = selectedAgent
    ? AGENT_ICON_CONFIGS[selectedAgent] || []
    : [];

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="agent-select">Agent</Label>
        <Select value={selectedAgent} onValueChange={onAgentChange}>
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
          onValueChange={onAbilityChange}
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
      <LineupImageUpload
        images={uploadedImages}
        onImagesAdd={onImagesAdd}
        onImageRemove={onImageRemove}
        onImageExpand={onImageExpand}
      />
      <div className="space-y-2">
        <Label htmlFor="youtube-link">YouTube Link</Label>
        <Input
          id="youtube-link"
          type="url"
          placeholder="https://www.youtube.com/watch?v=..."
          value={youtubeLink}
          onChange={(e) => onYoutubeLinkChange(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Add any notes about this lineup..."
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="line-color">Line Color</Label>
        <div className="flex items-center gap-3">
          <input
            id="line-color"
            type="color"
            value={lineColor}
            onChange={(e) => onLineColorChange(e.target.value)}
            className="h-6 w-6 cursor-pointer rounded"
          />
        </div>
      </div>
    </>
  );
};
