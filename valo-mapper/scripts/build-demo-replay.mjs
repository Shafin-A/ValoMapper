#!/usr/bin/env node
/**
 * Rebuilds public/replays/demo.json.gz from a local .vrf via
 * valo-mapper-api/cmd/replaydump.
 *
 * Usage: node scripts/build-demo-replay.mjs "<replay.vrf>" [frame-hz]
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(projectRoot, "..");
const apiRoot = path.join(repoRoot, "valo-mapper-api");
const outputPath = path.join(projectRoot, "public", "replays", "demo.json.gz");

const input = process.argv[2];
if (!input) {
  console.error(
    'Usage: node scripts/build-demo-replay.mjs "<replay.vrf>" [frame-hz]',
  );
  process.exit(2);
}

const inputPath = path.resolve(input);
if (!fs.existsSync(inputPath)) {
  console.error(`Replay not found: ${inputPath}`);
  process.exit(2);
}

const frameHz = process.argv[3] ?? "8";
const temporaryDir = fs.mkdtempSync(path.join(os.tmpdir(), "valomapper-demo-"));
const temporaryJson = path.join(temporaryDir, "replay.json");

const readEnvValue = (key) => {
  const envPath = path.join(apiRoot, ".env");
  if (!fs.existsSync(envPath)) {
    return undefined;
  }

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    const separator = trimmed.indexOf("=");
    if (!trimmed || trimmed.startsWith("#") || separator < 0) {
      continue;
    }
    if (trimmed.slice(0, separator).trim() !== key) {
      continue;
    }
    return trimmed
      .slice(separator + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }

  return undefined;
};

const vrfkitBin = process.env.VRFKIT_BIN || readEnvValue("VRFKIT_BIN");
const childEnv = vrfkitBin
  ? { ...process.env, VRFKIT_BIN: vrfkitBin }
  : process.env;

try {
  execFileSync(
    "go",
    ["run", "./cmd/replaydump", inputPath, temporaryJson, frameHz],
    { cwd: apiRoot, env: childEnv, stdio: "inherit" },
  );

  const envelope = JSON.parse(fs.readFileSync(temporaryJson, "utf8"));
  if (!envelope?.match) {
    throw new Error("The replay parser returned no match.");
  }

  const match = { ...envelope.match, source: "demo" };
  const json = JSON.stringify(match);
  const gzipped = gzipSync(json, { level: 9 });

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, gzipped);

  console.log(
    `Wrote ${outputPath} (${(json.length / 1_048_576).toFixed(1)} MB JSON, ` +
      `${(gzipped.length / 1_048_576).toFixed(2)} MB gzip)`,
  );
} finally {
  fs.rmSync(temporaryDir, { recursive: true, force: true });
}
