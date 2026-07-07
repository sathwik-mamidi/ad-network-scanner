import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { csvEscape, parseDomainRow, readDomains, writeMatches } from "../dist/csv.js";

test("parseDomainRow normalizes supported CSV shapes", () => {
  assert.deepEqual(parseDomainRow({ Rank: "1", Domain: "https://Example.com/path" }), {
    rank: 1,
    domain: "example.com",
  });
  assert.deepEqual(parseDomainRow({ rank: "2", host: "sub.example.org" }), {
    rank: 2,
    domain: "sub.example.org",
  });
  assert.equal(parseDomainRow({ rank: "0", domain: "example.com" }), null);
  assert.equal(parseDomainRow({ rank: "1", domain: "bad domain" }), null);
});

test("readDomains filters by rank and ignores malformed rows", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ad-network-scanner-"));
  const input = path.join(directory, "domains.csv");

  await writeFile(
    input,
    [
      "rank,domain",
      "1,https://Example.com/path",
      "2,bad domain",
      "3,github.com",
      "10,openai.com",
    ].join("\n")
  );

  assert.deepEqual(await readDomains(input, 5), [
    { rank: 1, domain: "example.com" },
    { rank: 3, domain: "github.com" },
  ]);
});

test("writeMatches writes a stable CSV with escaping", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ad-network-scanner-"));
  const output = path.join(directory, "nested", "matches.csv");

  await writeMatches(output, [
    {
      rank: 1,
      domain: "example.com",
      matchedUrl: 'https://ads.example.com/path?q="quoted"',
      finalUrl: "https://example.com/",
    },
  ]);

  assert.equal(
    await readFile(output, "utf8"),
    'rank,domain,matchedUrl,finalUrl\n1,example.com,"https://ads.example.com/path?q=""quoted""",https://example.com/\n'
  );
});

test("csvEscape quotes only when needed", () => {
  assert.equal(csvEscape("plain"), "plain");
  assert.equal(csvEscape("has,comma"), '"has,comma"');
});
