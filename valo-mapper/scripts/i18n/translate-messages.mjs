#!/usr/bin/env node
// Generates a machine-translated baseline for each locale from en-US.

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const APP_ROOT = path.resolve(
  fileURLToPath(new URL("../..", import.meta.url)),
);
const MESSAGES_DIR = path.join(APP_ROOT, "src", "i18n", "messages");
const ALL_LOCALES = [
  "ar-AE",
  "de-DE",
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
];

const args = process.argv.slice(2);
const placeholdersOnly = args.includes("--placeholders-only");
const requestedLocales = args.filter((arg) => !arg.startsWith("--"));
const LOCALES = requestedLocales.length ? requestedLocales : ALL_LOCALES;
const BATCH_SIZE = 16;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const splitIcu = (text) => {
  const parts = [];
  let buffer = "";
  let index = 0;

  while (index < text.length) {
    if (text[index] !== "{") {
      buffer += text[index];
      index++;
      continue;
    }

    if (buffer) {
      parts.push({ type: "text", value: buffer });
      buffer = "";
    }

    let depth = 0;
    let end = index;
    for (; end < text.length; end++) {
      if (text[end] === "{") depth++;
      if (text[end] === "}") {
        depth--;
        if (depth === 0) {
          end++;
          break;
        }
      }
    }

    parts.push({ type: "icu", value: text.slice(index, end) });
    index = end;
  }

  if (buffer) parts.push({ type: "text", value: buffer });
  return parts;
};

const tokenizeIcu = (text) => {
  const expressions = [];
  const tokenized = splitIcu(text)
    .map((part) => {
      if (part.type === "text") return part.value;
      const token = `ZXQICU${expressions.length}QXZ`;
      expressions.push(part.value);
      return token;
    })
    .join("");

  return { tokenized, expressions };
};

const restoreIcu = (text, expressions) =>
  expressions.reduce(
    (result, expression, index) =>
      result.split(`ZXQICU${index}QXZ`).join(expression),
    text,
  );

const hasIcuExpression = (value) => splitIcu(value).some((p) => p.type === "icu");

const wrapStrings = (value, texts) => {
  if (typeof value === "string") {
    const parts = splitIcu(value);
    for (const part of parts) {
      if (part.type === "text" && part.value.trim()) texts.push(part.value);
    }
    return { __parts: parts };
  }

  if (Array.isArray(value)) {
    return value.map((entry) => wrapStrings(entry, texts));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        wrapStrings(entry, texts),
      ]),
    );
  }

  return value;
};

const rebuild = (value, translations) => {
  if (value && typeof value === "object" && Array.isArray(value.__parts)) {
    return value.__parts
      .map((part) => {
        if (part.type === "icu") return part.value;

        const source = part.value;
        let translated = translations.get(source) ?? source;
        const leading = source.match(/^\s+/)?.[0] ?? "";
        const trailing = source.match(/\s+$/)?.[0] ?? "";

        if (leading && !/^\s/.test(translated)) translated = leading + translated;
        if (trailing && !/\s$/.test(translated)) translated += trailing;
        return translated;
      })
      .join("");
  }

  if (Array.isArray(value)) {
    return value.map((entry) => rebuild(entry, translations));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        rebuild(entry, translations),
      ]),
    );
  }

  return value;
};

const translateBatch = async (texts, target) => {
  const url = new URL("https://translate.googleapis.com/translate_a/t");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "en");
  url.searchParams.set("tl", target);
  for (const text of texts) url.searchParams.append("q", text);

  for (let attempt = 0; attempt < 7; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (!Array.isArray(payload) || payload.length !== texts.length) {
        throw new Error("Unexpected translation response");
      }
      return payload;
    } catch (error) {
      if (attempt === 6) throw error;
      await sleep(1500 * (attempt + 1));
    }
  }

  return texts;
};

const main = async () => {
  const base = JSON.parse(
    await readFile(path.join(MESSAGES_DIR, "en-US.json"), "utf8"),
  );

  const collectIcuStrings = (value, result) => {
    if (typeof value === "string") {
      if (hasIcuExpression(value)) result.add(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((entry) => collectIcuStrings(entry, result));
      return;
    }
    if (value && typeof value === "object") {
      Object.values(value).forEach((entry) => collectIcuStrings(entry, result));
    }
  };

  for (const locale of LOCALES) {
    if (placeholdersOnly) {
      const current = JSON.parse(
        await readFile(path.join(MESSAGES_DIR, `${locale}.json`), "utf8"),
      );
      const sources = new Set();
      collectIcuStrings(base, sources);

      const tokenizedSources = [...sources].map((source) => ({
        source,
        ...tokenizeIcu(source),
      }));
      const translations = new Map();

      for (let index = 0; index < tokenizedSources.length; index += BATCH_SIZE) {
        const batch = tokenizedSources.slice(index, index + BATCH_SIZE);
        const translated = await translateBatch(
          batch.map((entry) => entry.tokenized),
          locale,
        );

        batch.forEach((entry, batchIndex) => {
          const value = translated[batchIndex];
          translations.set(
            entry.source,
            typeof value === "string" && value.trim()
              ? restoreIcu(value, entry.expressions)
              : entry.source,
          );
        });
        await sleep(700);
      }

      const apply = (source, target) => {
        const currentValue = target ?? source;
        if (typeof source === "string") {
          return hasIcuExpression(source)
            ? (translations.get(source) ?? currentValue)
            : currentValue;
        }
        if (Array.isArray(source)) {
          return source.map((entry, index) => apply(entry, target?.[index]));
        }
        if (source && typeof source === "object") {
          return Object.fromEntries(
            Object.entries(source).map(([key, entry]) => [
              key,
              apply(entry, target?.[key]),
            ]),
          );
        }
        return target;
      };

      const output = apply(base, current);
      await writeFile(
        path.join(MESSAGES_DIR, `${locale}.json`),
        `${JSON.stringify(output, null, 2)}\n`,
        "utf8",
      );
      console.log(`[ok] ${locale}: ${tokenizedSources.length} ICU strings`);
      continue;
    }

    const texts = [];
    const wrapped = wrapStrings(base, texts);
    const unique = [...new Set(texts)];
    const translations = new Map();

    for (let index = 0; index < unique.length; index += BATCH_SIZE) {
      const batch = unique.slice(index, index + BATCH_SIZE);
      const translated = await translateBatch(batch, locale);
      batch.forEach((text, batchIndex) => {
        const value = translated[batchIndex];
        translations.set(
          text,
          typeof value === "string" && value.trim() ? value : text,
        );
      });
      await sleep(700);
    }

    const output = rebuild(wrapped, translations);
    await writeFile(
      path.join(MESSAGES_DIR, `${locale}.json`),
      `${JSON.stringify(output, null, 2)}\n`,
      "utf8",
    );
    console.log(`[ok] ${locale}: ${unique.length} strings`);
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
