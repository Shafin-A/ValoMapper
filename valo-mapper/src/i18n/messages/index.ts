import type { Locale } from "../config";
import enUS from "./en-US.json";

export type Messages = typeof enUS;

type MessagesLoader = () => Promise<{ default: Record<string, unknown> }>;

// Locales without a message file fall back to English during rollout.
const MESSAGE_LOADERS: Partial<Record<Locale, MessagesLoader>> = {
  "en-US": async () => ({ default: enUS }),
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
