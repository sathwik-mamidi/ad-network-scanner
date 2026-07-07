import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_OPTIONS, parseCliArgs } from "../dist/cli.js";

test("parseCliArgs returns documented defaults", () => {
  assert.deepEqual(parseCliArgs([], {}), DEFAULT_OPTIONS);
});

test("parseCliArgs applies environment defaults and lets flags override them", () => {
  const options = parseCliArgs(
    [
      "--input",
      "flag-sites.csv",
      "--pattern",
      "adservice.google.com",
      "--max-rank",
      "10",
      "--concurrency",
      "2",
      "--headed",
      "--disable-browser-sandbox",
    ],
    {
      AD_SCANNER_INPUT: "env-sites.csv",
      AD_SCANNER_OUTPUT: "env-output.csv",
      AD_SCANNER_PATTERN: "doubleclick.net",
      AD_SCANNER_MAX_RANK: "500",
      AD_SCANNER_TIMEOUT_MS: "4000",
      AD_SCANNER_SETTLE_MS: "25",
      AD_SCANNER_CONCURRENCY: "4",
      AD_SCANNER_HEADED: "false",
      AD_SCANNER_DISABLE_BROWSER_SANDBOX: "false",
    }
  );

  assert.equal(options.input, "flag-sites.csv");
  assert.equal(options.output, "env-output.csv");
  assert.equal(options.pattern, "adservice.google.com");
  assert.equal(options.maxRank, 10);
  assert.equal(options.timeoutMs, 4000);
  assert.equal(options.settleMs, 25);
  assert.equal(options.concurrency, 2);
  assert.equal(options.headed, true);
  assert.equal(options.disableBrowserSandbox, true);
});

test("parseCliArgs rejects invalid input", () => {
  assert.throws(() => parseCliArgs(["--concurrency", "0"], {}), /--concurrency/);
  assert.throws(() => parseCliArgs(["--missing"], {}), /Unknown option/);
  assert.throws(() => parseCliArgs(["--input"], {}), /requires a value/);
  assert.throws(() => parseCliArgs([], { AD_SCANNER_HEADED: "sometimes" }), /AD_SCANNER_HEADED/);
});
