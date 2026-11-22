"use client";

import { createContext, ReactNode, useContext } from "react";

import {
  EMPTY_VALORANT_TERMS,
  getLocalizedAbilityName,
  getLocalizedAgentName,
  getLocalizedAgentRole,
  getLocalizedMapName,
  getLocalizedRoleName,
  getLocalizedWeaponName,
  type ValorantTermData,
} from "@/lib/i18n/valorant-terms";

const ValorantTermsContext = createContext<ValorantTermData>(
  EMPTY_VALORANT_TERMS,
);

export const ValorantTermsProvider = ({
  terms,
  children,
}: {
  terms: ValorantTermData;
  children: ReactNode;
}) => (
  <ValorantTermsContext.Provider value={terms}>
    {children}
  </ValorantTermsContext.Provider>
);

export const useValorantTerms = () => useContext(ValorantTermsContext);

export const useLocalizedAgentName = (canonicalName: string) =>
  getLocalizedAgentName(useValorantTerms(), canonicalName);

export const useLocalizedAgentRole = (canonicalName: string) =>
  getLocalizedAgentRole(useValorantTerms(), canonicalName);

export const useLocalizedRoleName = (canonicalRole: string) =>
  getLocalizedRoleName(useValorantTerms(), canonicalRole);

export const useLocalizedAbilityName = (
  canonicalAgentName: string,
  slot: string,
  fallback: string,
) =>
  getLocalizedAbilityName(
    useValorantTerms(),
    canonicalAgentName,
    slot,
    fallback,
  );

export const useLocalizedMapName = (mapId: string, fallback: string) =>
  getLocalizedMapName(useValorantTerms(), mapId, fallback);

export const useLocalizedWeaponName = (weaponSlug: string, fallback: string) =>
  getLocalizedWeaponName(useValorantTerms(), weaponSlug, fallback);
