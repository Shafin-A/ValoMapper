export const LOCALES = [
  "ar-AE",
  "de-DE",
  "en-US",
  "es-ES",
  "es-MX",
  "fr-FR",
  "id-ID",
  "it-IT",
  "ja-JP",
  "ko-KR",
  "pl-PL",
  "pt-BR",
  "ru-RU",
  "th-TH",
  "tr-TR",
  "vi-VN",
  "zh-CN",
  "zh-TW",
] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en-US";

export const LOCALE_COOKIE = "vm_locale";

// Arabic is enabled with a best-effort RTL pass.
export const DEFERRED_LOCALES: readonly Locale[] = [];

export const LAUNCH_LOCALES: readonly Locale[] = LOCALES.filter(
  (locale) => !DEFERRED_LOCALES.includes(locale),
);

export type LocaleMeta = {
  nativeName: string;
  englishName: string;
  dir: "ltr" | "rtl";
};

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  "ar-AE": { nativeName: "العربية", englishName: "Arabic", dir: "rtl" },
  "de-DE": { nativeName: "Deutsch", englishName: "German", dir: "ltr" },
  "en-US": { nativeName: "English", englishName: "English", dir: "ltr" },
  "es-ES": {
    nativeName: "Español (España)",
    englishName: "Spanish (Spain)",
    dir: "ltr",
  },
  "es-MX": {
    nativeName: "Español (Latinoamérica)",
    englishName: "Spanish (Latin America)",
    dir: "ltr",
  },
  "fr-FR": { nativeName: "Français", englishName: "French", dir: "ltr" },
  "id-ID": {
    nativeName: "Bahasa Indonesia",
    englishName: "Indonesian",
    dir: "ltr",
  },
  "it-IT": { nativeName: "Italiano", englishName: "Italian", dir: "ltr" },
  "ja-JP": { nativeName: "日本語", englishName: "Japanese", dir: "ltr" },
  "ko-KR": { nativeName: "한국어", englishName: "Korean", dir: "ltr" },
  "pl-PL": { nativeName: "Polski", englishName: "Polish", dir: "ltr" },
  "pt-BR": {
    nativeName: "Português (Brasil)",
    englishName: "Portuguese (Brazil)",
    dir: "ltr",
  },
  "ru-RU": { nativeName: "Русский", englishName: "Russian", dir: "ltr" },
  "th-TH": { nativeName: "ไทย", englishName: "Thai", dir: "ltr" },
  "tr-TR": { nativeName: "Türkçe", englishName: "Turkish", dir: "ltr" },
  "vi-VN": { nativeName: "Tiếng Việt", englishName: "Vietnamese", dir: "ltr" },
  "zh-CN": { nativeName: "简体中文", englishName: "Chinese (Simplified)", dir: "ltr" },
  "zh-TW": { nativeName: "繁體中文", englishName: "Chinese (Traditional)", dir: "ltr" },
};

export const isLocale = (value: unknown): value is Locale =>
  typeof value === "string" && (LOCALES as readonly string[]).includes(value);

export const isLaunchLocale = (value: unknown): value is Locale =>
  typeof value === "string" &&
  (LAUNCH_LOCALES as readonly string[]).includes(value);

const BASE_LOCALE_MAP: Record<string, Locale> = {
  ar: "ar-AE",
  de: "de-DE",
  en: "en-US",
  fr: "fr-FR",
  id: "id-ID",
  it: "it-IT",
  ja: "ja-JP",
  ko: "ko-KR",
  pl: "pl-PL",
  pt: "pt-BR",
  ru: "ru-RU",
  th: "th-TH",
  tr: "tr-TR",
  vi: "vi-VN",
};

const pickAvailable = (
  requested: Locale,
  available: readonly Locale[],
): Locale | null => (available.includes(requested) ? requested : null);

const matchLocaleTag = (
  tag: string,
  available: readonly Locale[],
): Locale | null => {
  const normalized = tag.trim().replace(/_/g, "-");
  if (!normalized) return null;

  const exact = available.find(
    (locale) => locale.toLowerCase() === normalized.toLowerCase(),
  );
  if (exact) return exact;

  const parts = normalized.toLowerCase().split("-");
  const base = parts[0];
  const subtags = parts.slice(1);
  const region = subtags.find((part) => part.length === 2);
  const script = subtags.find((part) => part.length === 4);

  if (base === "zh") {
    if (script === "hant" || ["tw", "hk", "mo"].includes(region ?? "")) {
      return pickAvailable("zh-TW", available);
    }
    return pickAvailable("zh-CN", available);
  }

  if (base === "es") {
    if (region === "es") return pickAvailable("es-ES", available);
    return pickAvailable("es-MX", available);
  }

  const mapped = BASE_LOCALE_MAP[base];
  return mapped ? pickAvailable(mapped, available) : null;
};

type AcceptLanguageEntry = {
  tag: string;
  quality: number;
};

export const parseAcceptLanguage = (
  header: string | null | undefined,
): AcceptLanguageEntry[] => {
  if (!header) return [];

  return header
    .split(",")
    .map((entry): AcceptLanguageEntry | null => {
      const [rawTag, ...parameters] = entry.trim().split(";");
      const tag = rawTag?.trim();
      if (!tag) return null;

      const qualityParameter = parameters.find((parameter) =>
        parameter.trim().startsWith("q="),
      );
      const parsedQuality = qualityParameter
        ? Number.parseFloat(qualityParameter.trim().slice(2))
        : 1;

      return {
        tag,
        quality: Number.isFinite(parsedQuality) ? parsedQuality : 1,
      };
    })
    .filter((entry): entry is AcceptLanguageEntry => entry !== null)
    .sort((a, b) => b.quality - a.quality);
};

export const negotiateLocale = (
  acceptLanguage: string | null | undefined,
  available: readonly Locale[] = LAUNCH_LOCALES,
): Locale => {
  for (const { tag } of parseAcceptLanguage(acceptLanguage)) {
    if (tag === "*") break;
    const match = matchLocaleTag(tag, available);
    if (match) return match;
  }

  return available.includes(DEFAULT_LOCALE)
    ? DEFAULT_LOCALE
    : (available[0] ?? DEFAULT_LOCALE);
};

export const getLocaleMeta = (locale: Locale): LocaleMeta =>
  LOCALE_META[locale];
