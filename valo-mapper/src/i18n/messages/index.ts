import type { Locale } from "../config";
import arAE from "./ar-AE.json";
import deDE from "./de-DE.json";
import enUS from "./en-US.json";
import esES from "./es-ES.json";
import esMX from "./es-MX.json";
import frFR from "./fr-FR.json";
import idID from "./id-ID.json";
import itIT from "./it-IT.json";
import jaJP from "./ja-JP.json";
import koKR from "./ko-KR.json";
import plPL from "./pl-PL.json";
import ptBR from "./pt-BR.json";
import ruRU from "./ru-RU.json";
import thTH from "./th-TH.json";
import trTR from "./tr-TR.json";
import viVN from "./vi-VN.json";
import zhCN from "./zh-CN.json";
import zhTW from "./zh-TW.json";

export type Messages = typeof enUS;

type MessagesLoader = () => Promise<{ default: Record<string, unknown> }>;

// Locales without a message file fall back to English during rollout.
const MESSAGE_LOADERS: Partial<Record<Locale, MessagesLoader>> = {
  "ar-AE": async () => ({ default: arAE }),
  "de-DE": async () => ({ default: deDE }),
  "en-US": async () => ({ default: enUS }),
  "es-ES": async () => ({ default: esES }),
  "es-MX": async () => ({ default: esMX }),
  "fr-FR": async () => ({ default: frFR }),
  "id-ID": async () => ({ default: idID }),
  "it-IT": async () => ({ default: itIT }),
  "ja-JP": async () => ({ default: jaJP }),
  "ko-KR": async () => ({ default: koKR }),
  "pl-PL": async () => ({ default: plPL }),
  "pt-BR": async () => ({ default: ptBR }),
  "ru-RU": async () => ({ default: ruRU }),
  "th-TH": async () => ({ default: thTH }),
  "tr-TR": async () => ({ default: trTR }),
  "vi-VN": async () => ({ default: viVN }),
  "zh-CN": async () => ({ default: zhCN }),
  "zh-TW": async () => ({ default: zhTW }),
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const deepMerge = (
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> => {
  const result: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(override)) {
    const baseValue = result[key];

    result[key] =
      isPlainObject(baseValue) && isPlainObject(value)
        ? deepMerge(baseValue, value)
        : value;
  }

  return result;
};

export const loadMessages = async (locale: Locale): Promise<Messages> => {
  const loader = MESSAGE_LOADERS[locale];
  if (!loader) return enUS;

  const localized = await loader();
  return deepMerge(
    enUS as unknown as Record<string, unknown>,
    localized.default,
  ) as Messages;
};
