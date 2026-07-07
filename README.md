# Ad Network Scanner

Ad Network Scanner is a lightweight TypeScript CLI for scanning ranked domain lists and recording which sites trigger requests that match an advertising or tracking network pattern. It uses Puppeteer to visit each site in Chromium, listens to network requests, and writes matching domains to a CSV file.

The project is intentionally small: no web server, no database, and no queue system. It is meant for repeatable local or CI-assisted research runs where the input is a CSV of ranked domains and the output is an auditable match list.

## Features

- Reads CSV files with `rank` and `domain` columns.
- Normalizes domains from bare hostnames or full URLs.
- Visits each domain in Chromium with bounded concurrency.
- Detects request URLs containing a configurable substring, such as `doubleclick.net`.
- Falls back from HTTPS to HTTP when navigation fails.
- Writes a stable `rank,domain,matchedUrl,finalUrl` CSV.
- Supports CLI flags and environment-variable defaults.

## Requirements

- Node.js 24 or newer.
- npm 11 or newer.
- A machine that can run Puppeteer-managed Chromium.

Puppeteer downloads and manages a compatible Chromium build during installation unless your environment configures Puppeteer differently. In locked-down environments, set `PUPPETEER_EXECUTABLE_PATH` to an installed Chrome or Chromium binary.

## Setup

```bash
npm install
npm run build
```

Run a small sample scan:

```bash
npm run dev -- --input sample-websites.csv --max-rank 5 --pattern doubleclick.net --output results/sample-matches.csv
```

Run the compiled CLI:

```bash
npm run build
node dist/index.js --input websites.csv --max-rank 1000 --pattern doubleclick.net --output results/matches.csv
```

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run the TypeScript CLI through `tsx`. |
| `npm run build` | Compile TypeScript into `dist/`. |
| `npm run start` | Run the compiled CLI from `dist/index.js`. |
| `npm run check` | Type-check without emitting files. |
| `npm test` | Build and run the Node test suite. |
| `npm run smoke` | Scan `sample-websites.csv` and write `results/sample-matches.csv`. |

Pass CLI options after `--` when using npm scripts:

```bash
npm run dev -- --input sample-websites.csv --max-rank 5
```

## CLI Options

| Option | Default | Purpose |
| --- | --- | --- |
| `--input <file>` | `websites.csv` | Input CSV with ranked domains. |
| `--output <file>` | `results/matches.csv` | Output CSV for detected matches. |
| `--pattern <text>` | `doubleclick.net` | Case-insensitive request URL substring to detect. |
| `--max-rank <number>` | `1000` | Highest rank included in the scan. |
| `--timeout-ms <ms>` | `8000` | Navigation timeout per protocol attempt. |
| `--settle-ms <ms>` | `1500` | Extra wait after navigation for late network requests. |
| `--concurrency <n>` | `3` | Number of domains scanned in parallel. |
| `--headed` | `false` | Show Chromium instead of running headless. |
| `--disable-browser-sandbox` | `false` | Pass Chromium no-sandbox flags for restricted containers. |
| `--help` | | Print CLI help. |

CLI flags override environment variables.

## Environment Variables

No secrets are required. `.env` files are ignored by Git; `.env.example` documents optional defaults you can load in shells or with Node's `--env-file` support.

| Variable | Default | Purpose |
| --- | --- | --- |
| `AD_SCANNER_INPUT` | `websites.csv` | Default input CSV path. |
| `AD_SCANNER_OUTPUT` | `results/matches.csv` | Default output CSV path. |
| `AD_SCANNER_PATTERN` | `doubleclick.net` | Default request URL substring. |
| `AD_SCANNER_MAX_RANK` | `1000` | Default maximum rank. |
| `AD_SCANNER_TIMEOUT_MS` | `8000` | Default navigation timeout. |
| `AD_SCANNER_SETTLE_MS` | `1500` | Default post-navigation wait. |
| `AD_SCANNER_CONCURRENCY` | `3` | Default scan concurrency. |
| `AD_SCANNER_HEADED` | `false` | Set to `true` to show Chromium. |
| `AD_SCANNER_DISABLE_BROWSER_SANDBOX` | `false` | Set to `true` only when the host cannot run Chromium's sandbox. |
| `PUPPETEER_EXECUTABLE_PATH` | | Optional Puppeteer override for a system Chrome or Chromium binary. |

Example:

```bash
node --env-file=.env dist/index.js
```

## Input Format

The scanner expects a CSV with headers. The primary headers are:

```csv
rank,domain
1,example.com
2,https://www.example.org/path
```

`Rank`, `RANK`, `Domain`, `DOMAIN`, `host`, and `Host` are also accepted. Invalid ranks, empty domains, and domains containing whitespace are skipped.

## Output Format

Matches are written as:

```csv
rank,domain,matchedUrl,finalUrl
1,example.com,https://ad.doubleclick.net/...,https://www.example.com/
```

The output directory is created automatically. Generated scan results belong under `results/`, which is ignored by Git.

## Architecture

```text
src/
  cli.ts          CLI flag and environment parsing
  concurrency.ts  Lightweight bounded-concurrency mapper
  csv.ts          Domain CSV parsing and match CSV writing
  scanner.ts      Puppeteer launch and domain scan logic
  types.ts        Shared TypeScript types
  index.ts        Executable entrypoint and run orchestration
test/
  *.test.js       Node test runner tests against compiled dist files
```

The scanner keeps orchestration separate from browser behavior so CLI parsing, CSV handling, and concurrency can be tested without launching Chromium.

## Operational Notes

- Network scans are inherently noisy. Results can change by location, time, consent state, browser version, geofencing, and ad auction behavior.
- Use conservative concurrency. Higher values can increase false negatives, trigger site rate limits, or exhaust local CPU and memory.
- `--disable-browser-sandbox` is intended for containers that cannot support Chromium's sandbox. Leave it off on normal local machines.
- Respect applicable laws, site terms, and robots or research policies when scanning third-party domains.
- Large local CSV inputs, `.env` files, generated `dist/`, and `results/` outputs are intentionally ignored by Git.

## License

MIT
