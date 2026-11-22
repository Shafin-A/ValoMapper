#!/usr/bin/env node
// Validates key parity and ICU placeholders against en-US.

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const APP_ROOT = path.resolve(
  fileURLToPath(new URL("../..", import.meta.url)),
);
const MESSAGES_DIR = path.join(APP_ROOT, "src", "i18n", "messages");
const BASE_LOCALE = "en-US";

const flatten = (value, prefix = "", result = new Map()) => {
  if (typeof value === "string") {
    result.set(prefix, value);
    return result;
  }

  if (Array.isArray(value)) {
    result.set(prefix, JSON.stringify(value));
    return result;
  }

  for (const [key, child] of Object.entries(value)) {
    flatten(child, prefix ? `${prefix}.${key}` : key, result);
  }

  return result;
};

const placeholders = (message) => {
  const found = new Set();
  for (const match of message.matchAll(/\{\s*([a-zA-Z_][\w]*)/g)) {
    found.add(match[1]);
  }
  return [...found].sort();
};

const readMessages = (file) =>
  JSON.parse(readFileSync(path.join(MESSAGES_DIR, file), "utf8"));

const baseFile = `${BASE_LOCALE}.json`;
const base = flatten(readMessages(baseFile));
const localeFiles = readdirSync(MESSAGES_DIR)
  .filter((file) => file.endsWith(".json"))
  .sort();

let failures = 0;
let warnings = 0;

for (const file of localeFiles) {
  const locale = file.replace(/\.json$/, "");
  const messages = flatten(readMessages(file));

  const missing = [...base.keys()].filter((key) => !messages.has(key));
  const extra = [...messages.keys()].filter((key) => !base.has(key));

  for (const key of missing) {
    console.error(`[${locale}] missing key: ${key}`);
    failures++;
  }

  for (const key of extra) {
    console.error(`[${locale}] extra key: ${key}`);
    failures++;
  }

  for (const [key, value] of messages) {
    if (!value.trim()) {
      console.error(`[${locale}] empty value: ${key}`);
      failures++;
      continue;
    }

    if (locale === BASE_LOCALE) continue;

    const baseValue = base.get(key);
    if (!baseValue) continue;

    const expected = placeholders(baseValue).join(",");
    const actual = placeholders(value).join(",");
    if (expected !== actual) {
      console.error(
        `[${locale}] placeholder mismatch in ${key}: expected {${expected}}, got {${actual}}`,
      );
      failures++;
    }

    if (value === baseValue) {
      warnings++;
    }
  }

  if (locale !== BASE_LOCALE && missing.length === 0 && extra.length === 0) {
    console.log(`[ok] ${locale}: ${messages.size} messages`);
  }
}

if (warnings > 0) {
  console.warn(
    `[warn] ${warnings} value(s) are identical to ${BASE_LOCALE}. This is fine for proper nouns, but review other cases.`,
  );
}

if (failures > 0) {
  console.error(`\n${failures} message validation error(s).`);
  process.exitCode = 1;
} else {
  console.log(`\nMessage files are valid (${localeFiles.length} locale file(s)).`);
}
