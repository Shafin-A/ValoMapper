"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Settings } from "lucide-react";
import { useState } from "react";

export const ReplaySettingsMenu = ({
  hideDeadAgents,
  onHideDeadAgentsChange,
  hideAgentWeapons,
  onHideAgentWeaponsChange,
  hideWeaponHits,
  onHideWeaponHitsChange,
  showVisionCones,
  onShowVisionConesChange,
  showUtilities,
  onShowUtilitiesChange,
  startAtBarrierDrop,
  onStartAtBarrierDropChange,
}: {
  hideDeadAgents: boolean;
  onHideDeadAgentsChange: (hideDeadAgents: boolean) => void;
  hideAgentWeapons: boolean;
  onHideAgentWeaponsChange: (hideAgentWeapons: boolean) => void;
  hideWeaponHits: boolean;
  onHideWeaponHitsChange: (hideWeaponHits: boolean) => void;
  showVisionCones: boolean;
  onShowVisionConesChange: (showVisionCones: boolean) => void;
  showUtilities: boolean;
  onShowUtilitiesChange: (showUtilities: boolean) => void;
  startAtBarrierDrop: boolean;
  onStartAtBarrierDropChange: (startAtBarrierDrop: boolean) => void;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          aria-label="Replay settings"
        >
          <Settings
            className={`h-4 w-4 transition-transform duration-300 ${
              open ? "rotate-90" : ""
            }`}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="hide-agent-vision" className="text-sm">
              Hide agent vision
            </Label>
            <Switch
              id="hide-agent-vision"
              checked={!showVisionCones}
              onCheckedChange={(hidden) => onShowVisionConesChange(!hidden)}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="show-replay-utilities" className="text-sm">
              Show utility
            </Label>
            <Switch
              id="show-replay-utilities"
              checked={showUtilities}
              onCheckedChange={onShowUtilitiesChange}
            />
          </div>
          <div
            aria-label="Utility legend"
            className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground"
          >
            {[
              ["#67e8f9", "Smoke"],
              ["#c4b5fd", "Wall"],
              ["#fb923c", "Molly"],
              ["#facc15", "Trap"],
              ["#4ade80", "Mobile"],
            ].map(([color, label]) => (
              <span key={label} className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: color }}
                />
                {label}
              </span>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="hide-agent-weapons" className="text-sm">
              Hide agent weapons
            </Label>
            <Switch
              id="hide-agent-weapons"
              checked={hideAgentWeapons}
              onCheckedChange={onHideAgentWeaponsChange}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="hide-weapon-hits" className="text-sm">
              Hide weapon hits
            </Label>
            <Switch
              id="hide-weapon-hits"
              checked={hideWeaponHits}
              onCheckedChange={onHideWeaponHitsChange}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="hide-dead-agents" className="text-sm">
              Hide dead agents
            </Label>
            <Switch
              id="hide-dead-agents"
              checked={hideDeadAgents}
              onCheckedChange={onHideDeadAgentsChange}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="start-at-barrier-drop" className="text-sm">
              Start at barrier drop
            </Label>
            <Switch
              id="start-at-barrier-drop"
              checked={startAtBarrierDrop}
              onCheckedChange={onStartAtBarrierDropChange}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
