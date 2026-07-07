import { createReadStream, createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { finished } from "node:stream/promises";

import { parse } from "csv-parse";

import type { DomainRecord, MatchRecord } from "./types.js";

type CsvRow = Record<string, unknown>;

const RANK_FIELDS = ["rank", "Rank", "RANK"];
const DOMAIN_FIELDS = ["domain", "Domain", "DOMAIN", "host", "Host", "HOST"];

export async function readDomains(input: string, maxRank: number): Promise<DomainRecord[]> {
  const records: DomainRecord[] = [];
  const parser = createReadStream(input).pipe(
    parse({
      columns: true,
      trim: true,
      skip_empty_lines: true,
    })
  );

  for await (const row of parser as AsyncIterable<CsvRow>) {
    const record = parseDomainRow(row);
    if (record && record.rank <= maxRank) {
      records.push(record);
    }
  }

  return records;
}

export function parseDomainRow(row: CsvRow): DomainRecord | null {
  const values = Object.values(row);
  const rank = parseRank(firstDefined(row, RANK_FIELDS) ?? values[0]);
  const domain = normalizeDomain(firstDefined(row, DOMAIN_FIELDS) ?? values[1]);

  if (!rank || !domain) return null;
  return { rank, domain };
}

export async function writeMatches(output: string, matches: MatchRecord[]): Promise<void> {
  await mkdir(path.dirname(output), { recursive: true });

  const stream = createWriteStream(output, { encoding: "utf8" });
  stream.write("rank,domain,matchedUrl,finalUrl\n");

  for (const match of matches) {
    stream.write([match.rank, match.domain, match.matchedUrl, match.finalUrl].map(csvEscape).join(",") + "\n");
  }

  stream.end();
  await finished(stream);
}

export function csvEscape(value: string | number): string {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function firstDefined(row: CsvRow, fields: string[]): unknown {
  for (const field of fields) {
    if (row[field] !== undefined) return row[field];
  }

  return undefined;
}

function parseRank(value: unknown): number | null {
  const text = String(value ?? "").replaceAll(",", "").trim();
  const rank = Number(text);
  return Number.isInteger(rank) && rank > 0 ? rank : null;
}

function normalizeDomain(value: unknown): string | null {
  const text = String(value ?? "").trim();
  if (!text || /\s/.test(text)) return null;

  try {
    const withProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(text) ? text : `https://${text}`;
    const hostname = new URL(withProtocol).hostname.toLowerCase();
    return hostname || null;
  } catch {
    return null;
  }
}
