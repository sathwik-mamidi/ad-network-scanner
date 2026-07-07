export type DomainRecord = {
  rank: number;
  domain: string;
};

export type MatchRecord = DomainRecord & {
  matchedUrl: string;
  finalUrl: string;
};

export type CliOptions = {
  input: string;
  output: string;
  pattern: string;
  maxRank: number;
  timeoutMs: number;
  settleMs: number;
  concurrency: number;
  headed: boolean;
  disableBrowserSandbox: boolean;
};

export type RunSummary = {
  scanned: number;
  matched: number;
  output: string;
};
