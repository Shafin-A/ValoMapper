import type { Locale } from "../config";
import enUS from "./en-US.json";

export type Messages = typeof enUS;

type MessagesLoader = () => Promise<{ default: Record<string, unknown> }>;

// Keep en-US static as the fallback/base catalog. Other locales are loaded
// on demand so a request only pulls in the active locale's message chunk.
const MESSAGE_LOADERS: Partial<Record<Locale, MessagesLoader>> = {
  "ar-AE": () => import("./ar-AE.json"),
  "de-DE": () => import("./de-DE.json"),
  "en-US": async () => ({ default: enUS }),
  "es-ES": () => import("./es-ES.json"),
  "es-MX": () => import("./es-MX.json"),
  "fr-FR": () => import("./fr-FR.json"),
  "id-ID": () => import("./id-ID.json"),
  "it-IT": () => import("./it-IT.json"),
  "ja-JP": () => import("./ja-JP.json"),
  "ko-KR": () => import("./ko-KR.json"),
  "pl-PL": () => import("./pl-PL.json"),
  "pt-BR": () => import("./pt-BR.json"),
  "ru-RU": () => import("./ru-RU.json"),
  "th-TH": () => import("./th-TH.json"),
  "tr-TR": () => import("./tr-TR.json"),
  "vi-VN": () => import("./vi-VN.json"),
  "zh-CN": () => import("./zh-CN.json"),
  "zh-TW": () => import("./zh-TW.json"),
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
