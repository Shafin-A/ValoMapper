"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { IconSettings } from "@/lib/types";

interface SettingsContextType {
  agentsSettings: IconSettings;
  abilitiesSettings: IconSettings;
  updateAgentsSettings: (settings: Partial<IconSettings>) => void;
  updateAbilitiesSettings: (settings: Partial<IconSettings>) => void;
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
    boxOpacity: 1,
    radius: 8,
    allyColor: "#18636c",
    enemyColor: "#FF4655",
  });

  const [abilitiesSettings, setAbilitiesSettings] = useState<IconSettings>({
    scale: 35,
    boxOpacity: 1,
    radius: 8,
    allyColor: "#18636c",
    enemyColor: "#FF4655",
  });

  const updateAgentsSettings = (newSettings: Partial<IconSettings>) => {
    setAgentsSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const updateAbilitiesSettings = (newSettings: Partial<IconSettings>) => {
    setAbilitiesSettings((prev) => ({ ...prev, ...newSettings }));
  };

  return (
    <SettingsContext.Provider
      value={{
        agentsSettings,
        abilitiesSettings,
        updateAgentsSettings,
        updateAbilitiesSettings,
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
