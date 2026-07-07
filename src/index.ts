#!/usr/bin/env node

import { pathToFileURL } from "node:url";

import { parseCliArgs, shouldShowHelp, usage } from "./cli.js";
import { mapConcurrent } from "./concurrency.js";
import { readDomains, writeMatches } from "./csv.js";
import { launchBrowser, scanDomain } from "./scanner.js";
import type { CliOptions, MatchRecord, RunSummary } from "./types.js";

export async function run(options: CliOptions): Promise<RunSummary> {
  const domains = await readDomains(options.input, options.maxRank);
  if (!domains.length) {
    throw new Error(`No domains with rank <= ${options.maxRank} were found in ${options.input}.`);
  }

  const browser = await launchBrowser(options);

  try {
    const results = await mapConcurrent(domains, options.concurrency, (record) => scanDomain(browser, record, options));
    const matches = results.filter((result): result is MatchRecord => Boolean(result));

    await writeMatches(options.output, matches);

    return {
      scanned: domains.length,
      matched: matches.length,
      output: options.output,
    };
  } finally {
    await browser.close();
  }
}

export async function main(args = process.argv.slice(2)): Promise<void> {
  if (shouldShowHelp(args)) {
    console.log(usage());
    return;
  }

  const summary = await run(parseCliArgs(args));
  console.log(`Scanned ${summary.scanned} domains and wrote ${summary.matched} matches to ${summary.output}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  });
}
