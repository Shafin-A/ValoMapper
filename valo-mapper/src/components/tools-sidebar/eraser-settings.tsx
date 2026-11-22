import { Slider } from "@/components/ui/slider";
import { useSettings } from "@/contexts/settings-context";
import { Switch } from "@/components/ui/switch";
import { Info } from "lucide-react";
import { useTranslations } from "next-intl";

export const EraserSettings = () => {
  const t = useTranslations("tools.eraserSettings");
  const { eraserSettings, updateEraserSettings } = useSettings();

  return (
    <div className="space-y-1 mt-6">
      <div className="flex items-center gap-6 p-2">
        <span className="text-sm font-medium w-20">{t("size")}</span>
        <Slider
          value={[eraserSettings.size]}
          onValueChange={(value) => updateEraserSettings({ size: value[0] })}
          max={10}
          min={1}
          step={1}
          className="flex-1"
        />
      </div>

      <div className="p-2">
        <div className="flex items-center gap-6">
          <span className="text-sm font-medium w-20">
            {t("eraseEntireLines")}
          </span>
          <Switch
            checked={eraserSettings.mode === "line"}
            onCheckedChange={(checked) =>
              updateEraserSettings({ mode: checked ? "line" : "pixel" })
            }
          />
        </div>

        <div className="mt-2">
          <div className="flex items-start gap-2">
            <Info className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
            <span className="text-xs text-muted-foreground italic">
              {t("hint")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
