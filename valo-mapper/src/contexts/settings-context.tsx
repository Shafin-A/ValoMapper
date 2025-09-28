"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { DrawSettings, EraserSettings, IconSettings } from "@/lib/types";

interface SettingsContextType {
  agentsSettings: IconSettings;
  abilitiesSettings: IconSettings;
  drawSettings: DrawSettings;
  eraserSettings: EraserSettings;
  updateAgentsSettings: (settings: Partial<IconSettings>) => void;
  updateAbilitiesSettings: (settings: Partial<IconSettings>) => void;
  updateDrawSettings: (settings: Partial<DrawSettings>) => void;
  updateEraserSettings: (settings: Partial<EraserSettings>) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider = ({ children }: SettingsProviderProps) => {
  const [agentsSettings, setAgentsSettings] = useState<IconSettings>({
    scale: 35,
    borderOpacity: 1,
    borderWidth: 3,
    radius: 8,
    allyColor: "#18636c",
    enemyColor: "#FF4655",
  });

  const [abilitiesSettings, setAbilitiesSettings] = useState<IconSettings>({
    scale: 35,
    borderOpacity: 1,
    borderWidth: 3,
    radius: 8,
    allyColor: "#18636c",
    enemyColor: "#FF4655",
  });

  const [drawSettings, setDrawSettings] = useState<DrawSettings>({
    size: 5,
    color: "#ffffff",
    isDashed: false,
    isArrowHead: false,
  });

  const [eraserSettings, setEraserSettings] = useState<EraserSettings>({
    size: 5,
    mode: "pixel",
  });

  const updateAgentsSettings = (newSettings: Partial<IconSettings>) => {
    setAgentsSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const updateAbilitiesSettings = (newSettings: Partial<IconSettings>) => {
    setAbilitiesSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const updateDrawSettings = (newSettings: Partial<DrawSettings>) => {
    setDrawSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const updateEraserSettings = (newSettings: Partial<EraserSettings>) => {
    setEraserSettings((prev) => ({ ...prev, ...newSettings }));
  };

  return (
    <SettingsContext.Provider
      value={{
        agentsSettings,
        abilitiesSettings,
        drawSettings,
        eraserSettings,
        updateAgentsSettings,
        updateAbilitiesSettings,
        updateDrawSettings,
        updateEraserSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
