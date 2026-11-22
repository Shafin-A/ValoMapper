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
import { getAbilityVariants } from "@/lib/consts/configs/agent-icon/consts";
import { getAgentImgSrc } from "@/lib/assets";
import Image from "next/image";
import { LineupImageUpload } from "./lineup-image-upload";
import { useValorantTerms } from "@/contexts/valorant-terms-context";
import {
  getLocalizedAbilityName,
  getLocalizedAgentName,
} from "@/lib/i18n/valorant-terms";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("canvas.lineup");
  const valorantTerms = useValorantTerms();
  const availableAbilities = selectedAgent
    ? (AGENT_ICON_CONFIGS[selectedAgent] || []).flatMap(getAbilityVariants)
    : [];

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="agent-select">{t("agent")}</Label>
        <Select value={selectedAgent} onValueChange={onAgentChange}>
          <SelectTrigger id="agent-select" className="w-full">
            <SelectValue placeholder={t("selectAgent")} />
          </SelectTrigger>
          <SelectContent className="w-full">
            {AGENTS.map((agent) => {
              const displayName = getLocalizedAgentName(
                valorantTerms,
                agent.name,
              );
              return (
                <SelectItem key={agent.name} value={agent.name}>
                  <div className="flex items-center gap-2">
                    <Image
                      src={getAgentImgSrc(agent.name)}
                      alt={displayName}
                      width={24}
                      height={24}
                      className="rounded"
                    />
                    <span>{displayName}</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="ability-select">{t("ability")}</Label>
        <Select
          value={selectedAbility}
          onValueChange={onAbilityChange}
          disabled={!selectedAgent}
        >
          <SelectTrigger id="ability-select" className="w-full">
            <SelectValue placeholder={t("selectAbility")} />
          </SelectTrigger>
          <SelectContent className="w-full">
            {availableAbilities.map((ability) => {
              const displayName = getLocalizedAbilityName(
                valorantTerms,
                selectedAgent,
                ability.slot,
                ability.name,
              );
              return (
                <SelectItem key={ability.id} value={ability.name}>
                  <div className="flex items-center gap-2">
                    <Image
                      src={ability.src}
                      alt={displayName}
                      width={24}
                      height={24}
                      className="rounded"
                    />
                    <span>{displayName}</span>
                  </div>
                </SelectItem>
              );
            })}
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
        <Label htmlFor="link">{t("link")}</Label>
        <Input
          id="link"
          type="url"
          placeholder="https://example.com/..."
          value={youtubeLink}
          onChange={(e) => onYoutubeLinkChange(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">{t("notes")}</Label>
        <Textarea
          id="notes"
          placeholder={t("notesPlaceholder")}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="line-color">{t("lineColor")}</Label>
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
