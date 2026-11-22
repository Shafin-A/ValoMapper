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

const findClosingBrace = (value, start) => {
  let depth = 0;
  for (let index = start; index < value.length; index++) {
    if (value[index] === "{") depth++;
    else if (value[index] === "}") {
      depth--;
      if (depth === 0) return index;
    }
  }
  return -1;
};

const parseOptions = (value) => {
  const options = {};
  let index = 0;
  while (index < value.length) {
    while (index < value.length && /\s/.test(value[index])) index++;
    const selectorStart = index;
    while (index < value.length && !/[\s{]/.test(value[index])) index++;
    const selector = value.slice(selectorStart, index);
    while (index < value.length && /\s/.test(value[index])) index++;
    if (!selector || value[index] !== "{") break;
    const end = findClosingBrace(value, index);
    if (end === -1) break;
    options[selector] = value.slice(index + 1, end);
    index = end + 1;
  }
  return options;
};

const collectArguments = (message, found) => {
  let index = 0;
  while (index < message.length) {
    if (message[index] !== "{") {
      index++;
      continue;
    }

    const end = findClosingBrace(message, index);
    if (end === -1) break;

    const token = message.slice(index + 1, end).trim();
    const firstComma = token.indexOf(",");

    if (firstComma === -1) {
      if (/^[a-zA-Z_][\w]*$/.test(token)) found.add(token);
    } else {
      const name = token.slice(0, firstComma).trim();
      if (/^[a-zA-Z_][\w]*$/.test(name)) found.add(name);

      const rest = token.slice(firstComma + 1).trim();
      const typeComma = rest.indexOf(",");
      const type = (typeComma === -1 ? rest : rest.slice(0, typeComma)).trim();

      if (
        typeComma !== -1 &&
        (type === "plural" || type === "selectordinal" || type === "select")
      ) {
        const options = parseOptions(rest.slice(typeComma + 1));
        for (const branch of Object.values(options)) {
          collectArguments(branch, found);
        }
      }
    }

    index = end + 1;
  }
};

const placeholders = (message) => {
  const found = new Set();
  collectArguments(message, found);
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
