import type { Locale } from "@/i18n/config";

import enUS from "../consts/data/valorant-i18n/en-US.json";
import type { ValorantTermData } from "./valorant-terms";

type TermsLoader = () => Promise<{ default: unknown }>;

const TERM_LOADERS: Record<Locale, TermsLoader> = {
  "ar-AE": () => import("../consts/data/valorant-i18n/ar-AE.json"),
  "de-DE": () => import("../consts/data/valorant-i18n/de-DE.json"),
  "en-US": async () => ({ default: enUS }),
  "es-ES": () => import("../consts/data/valorant-i18n/es-ES.json"),
  "es-MX": () => import("../consts/data/valorant-i18n/es-MX.json"),
  "fr-FR": () => import("../consts/data/valorant-i18n/fr-FR.json"),
  "id-ID": () => import("../consts/data/valorant-i18n/id-ID.json"),
  "it-IT": () => import("../consts/data/valorant-i18n/it-IT.json"),
  "ja-JP": () => import("../consts/data/valorant-i18n/ja-JP.json"),
  "ko-KR": () => import("../consts/data/valorant-i18n/ko-KR.json"),
  "pl-PL": () => import("../consts/data/valorant-i18n/pl-PL.json"),
  "pt-BR": () => import("../consts/data/valorant-i18n/pt-BR.json"),
  "ru-RU": () => import("../consts/data/valorant-i18n/ru-RU.json"),
  "th-TH": () => import("../consts/data/valorant-i18n/th-TH.json"),
  "tr-TR": () => import("../consts/data/valorant-i18n/tr-TR.json"),
  "vi-VN": () => import("../consts/data/valorant-i18n/vi-VN.json"),
  "zh-CN": () => import("../consts/data/valorant-i18n/zh-CN.json"),
  "zh-TW": () => import("../consts/data/valorant-i18n/zh-TW.json"),
};

export const getValorantTerms = async (
  locale: Locale,
): Promise<ValorantTermData> => {
  const loader = TERM_LOADERS[locale] ?? TERM_LOADERS["en-US"];

  try {
    const loaded = await loader();
    return loaded.default as ValorantTermData;
  } catch {
    return enUS as ValorantTermData;
  }
};
