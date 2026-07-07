import path from "node:path";

import type { CliOptions } from "./types.js";

type NumberOption = {
  key: keyof Pick<CliOptions, "maxRank" | "timeoutMs" | "settleMs" | "concurrency">;
  flag: string;
  env: string;
  min: number;
  max: number;
};

const NUMBER_OPTIONS: NumberOption[] = [
  { key: "maxRank", flag: "--max-rank", env: "AD_SCANNER_MAX_RANK", min: 1, max: 10_000_000 },
  { key: "timeoutMs", flag: "--timeout-ms", env: "AD_SCANNER_TIMEOUT_MS", min: 1_000, max: 120_000 },
  { key: "settleMs", flag: "--settle-ms", env: "AD_SCANNER_SETTLE_MS", min: 0, max: 60_000 },
  { key: "concurrency", flag: "--concurrency", env: "AD_SCANNER_CONCURRENCY", min: 1, max: 20 },
];

const VALUE_FLAGS = new Set([
  "--input",
  "--output",
  "--pattern",
  ...NUMBER_OPTIONS.map((option) => option.flag),
]);

const BOOLEAN_FLAGS = new Set(["--headed", "--disable-browser-sandbox", "--help", "-h"]);

export const DEFAULT_OPTIONS: CliOptions = {
  input: "websites.csv",
  output: path.join("results", "matches.csv"),
  pattern: "doubleclick.net",
  maxRank: 1_000,
  timeoutMs: 8_000,
  settleMs: 1_500,
  concurrency: 3,
  headed: false,
  disableBrowserSandbox: false,
};

export function usage(): string {
  return `Ad Network Scanner

Usage:
  npm run dev -- --input sample-websites.csv --max-rank 5
  node dist/index.js --input websites.csv --pattern doubleclick.net

Options:
  --input <file>                 Input CSV. Default: websites.csv.
  --output <file>                Output CSV. Default: results/matches.csv.
  --pattern <text>               Case-insensitive request URL substring. Default: doubleclick.net.
  --max-rank <number>            Highest rank to scan. Default: 1000.
  --timeout-ms <ms>              Navigation timeout per protocol attempt. Default: 8000.
  --settle-ms <ms>               Extra wait after navigation. Default: 1500.
  --concurrency <n>              Parallel pages. Default: 3.
  --headed                       Show Chromium instead of running headless.
  --disable-browser-sandbox      Pass Chromium no-sandbox flags for restricted containers.
  --help                         Show this help text.
`;
}

export function shouldShowHelp(args: string[]): boolean {
  return args.includes("--help") || args.includes("-h");
}

export function parseCliArgs(args: string[], env: NodeJS.ProcessEnv = process.env): CliOptions {
  validateArgs(args);

  const options: CliOptions = {
    input: readEnvString(env.AD_SCANNER_INPUT, DEFAULT_OPTIONS.input),
    output: readEnvString(env.AD_SCANNER_OUTPUT, DEFAULT_OPTIONS.output),
    pattern: readEnvString(env.AD_SCANNER_PATTERN, DEFAULT_OPTIONS.pattern),
    maxRank: DEFAULT_OPTIONS.maxRank,
    timeoutMs: DEFAULT_OPTIONS.timeoutMs,
    settleMs: DEFAULT_OPTIONS.settleMs,
    concurrency: DEFAULT_OPTIONS.concurrency,
    headed: readEnvBoolean(env.AD_SCANNER_HEADED, DEFAULT_OPTIONS.headed, "AD_SCANNER_HEADED"),
    disableBrowserSandbox: readEnvBoolean(
      env.AD_SCANNER_DISABLE_BROWSER_SANDBOX,
      DEFAULT_OPTIONS.disableBrowserSandbox,
      "AD_SCANNER_DISABLE_BROWSER_SANDBOX"
    ),
  };

  for (const option of NUMBER_OPTIONS) {
    options[option.key] = readNumber(
      readOptionalEnv(env[option.env]),
      DEFAULT_OPTIONS[option.key],
      option.env,
      option.min,
      option.max
    );
  }

  options.input = readFlag(args, "--input") ?? options.input;
  options.output = readFlag(args, "--output") ?? options.output;
  options.pattern = readFlag(args, "--pattern") ?? options.pattern;

  for (const option of NUMBER_OPTIONS) {
    options[option.key] = readNumber(
      readFlag(args, option.flag),
      options[option.key],
      option.flag,
      option.min,
      option.max
    );
  }

  if (hasFlag(args, "--headed")) options.headed = true;
  if (hasFlag(args, "--disable-browser-sandbox")) options.disableBrowserSandbox = true;

  return validateOptions(options);
}

function validateArgs(args: string[]): void {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (VALUE_FLAGS.has(arg)) {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${arg} requires a value.`);
      }
      index += 1;
      continue;
    }

    if (BOOLEAN_FLAGS.has(arg)) continue;

    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }

    throw new Error(`Unexpected positional argument: ${arg}`);
  }
}

function validateOptions(options: CliOptions): CliOptions {
  const input = options.input.trim();
  const output = options.output.trim();
  const pattern = options.pattern.trim();

  if (!input) throw new Error("--input must not be empty.");
  if (!output) throw new Error("--output must not be empty.");
  if (!pattern) throw new Error("--pattern must not be empty.");

  return {
    ...options,
    input,
    output,
    pattern,
  };
}

function readFlag(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function readEnvString(value: string | undefined, fallback: string): string {
  return readOptionalEnv(value) ?? fallback;
}

function readOptionalEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function readNumber(value: string | undefined, fallback: number, name: string, min: number, max: number): number {
  if (value === undefined) return fallback;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} must be an integer from ${min} to ${max}.`);
  }

  return parsed;
}

function readEnvBoolean(value: string | undefined, fallback: boolean, name: string): boolean {
  const normalized = readOptionalEnv(value)?.toLowerCase();
  if (!normalized) return fallback;

  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;

  throw new Error(`${name} must be one of true, false, 1, 0, yes, no, on, or off.`);
}
