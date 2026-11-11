import { Slider } from "@/components/ui/slider";
import { IconSettings } from "@/lib/types";
import { debounce } from "@/lib/utils";
import { RefreshCw } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ColorPickerButton } from "@/components/shared/color-picker-button";

interface SettingsPanelProps {
  settings: IconSettings;
  onSettingsChange: (newSettings: Partial<IconSettings>) => void;
  onReset: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onSettingsChange,
  onReset,
}) => {
  const debouncedSetAllyColor = useMemo(
    () =>
      debounce((color: string) => onSettingsChange({ allyColor: color }), 16),
    [onSettingsChange],
  );

  const debouncedSetEnemyColor = useMemo(
    () =>
      debounce((color: string) => onSettingsChange({ enemyColor: color }), 16),
    [onSettingsChange],
  );

  return (
    <>
      <div className="flex p-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button onClick={onReset} variant="ghost">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" align="center">
            Reset settings
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="flex items-center gap-6 p-2">
        <span className="text-sm font-medium w-20">Scale</span>
        <Slider
          value={[settings.scale]}
          onValueChange={(value) => onSettingsChange({ scale: value[0] })}
          min={25}
          max={100}
          step={1}
          className="flex-1"
        />
      </div>
      <div className="flex items-center gap-6 p-2">
        <span className="text-sm font-medium w-20">Radius</span>
        <Slider
          value={[settings.radius]}
          onValueChange={(value) =>
            onSettingsChange({ ...settings, radius: value[0] })
          }
          min={1}
          max={50}
          step={1}
          className="flex-1"
        />
      </div>
      <div className="flex items-center gap-6 p-2">
        <span className="text-sm font-medium w-20">Border Opacity</span>
        <Slider
          value={[settings.borderOpacity]}
          onValueChange={(value) =>
            onSettingsChange({
              ...settings,
              borderOpacity: value[0],
            })
          }
          min={0}
          max={1}
          step={0.1}
          className="flex-1"
        />
      </div>
      <div className="flex items-center gap-6 p-2">
        <span className="text-sm font-medium w-20">Border Width</span>
        <Slider
          value={[settings.borderWidth]}
          onValueChange={(value) =>
            onSettingsChange({
              ...settings,
              borderWidth: value[0],
            })
          }
          min={1}
          max={10}
          step={1}
          className="flex-1"
        />
      </div>
      <div className="flex items-center gap-6 p-2">
        <span className="text-sm font-medium w-20">Ally Color</span>
        <ColorPickerButton
          label="Ally color"
          value={settings.allyColor}
          onChange={debouncedSetAllyColor}
        />
      </div>
      <div className="flex items-center gap-6 p-2">
        <span className="text-sm font-medium w-20">Enemy Color</span>
        <ColorPickerButton
          label="Enemy color"
          value={settings.enemyColor}
          onChange={debouncedSetEnemyColor}
        />
      </div>
    </>
  );
};
