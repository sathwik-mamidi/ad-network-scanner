import puppeteer, { type Browser, type LaunchOptions, type Page } from "puppeteer";

import type { CliOptions, DomainRecord, MatchRecord } from "./types.js";

const NAVIGATION_PROTOCOLS = ["https", "http"] as const;

export async function launchBrowser(options: CliOptions): Promise<Browser> {
  const launchOptions: LaunchOptions = {
    headless: !options.headed,
  };

  if (options.disableBrowserSandbox) {
    launchOptions.args = ["--no-sandbox", "--disable-setuid-sandbox"];
  }

  return puppeteer.launch(launchOptions);
}

export async function scanDomain(
  browser: Browser,
  record: DomainRecord,
  options: CliOptions
): Promise<MatchRecord | null> {
  const page = await browser.newPage();
  const pattern = options.pattern.toLowerCase();
  let matchedUrl = "";

  page.setDefaultNavigationTimeout(options.timeoutMs);
  page.on("request", (request) => {
    const url = request.url();
    if (!matchedUrl && url.toLowerCase().includes(pattern)) {
      matchedUrl = url;
    }
  });

  try {
    console.log(`Scanning #${record.rank}: ${record.domain}`);
    await navigate(page, record.domain, options.timeoutMs);
    await delay(options.settleMs);

    if (!matchedUrl) return null;

    return {
      ...record,
      matchedUrl,
      finalUrl: page.url(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Skipped ${record.domain}: ${message}`);
    return null;
  } finally {
    await page.close().catch(() => undefined);
  }
}

async function navigate(page: Page, domain: string, timeoutMs: number): Promise<void> {
  let lastError: unknown;

  for (const protocol of NAVIGATION_PROTOCOLS) {
    try {
      await page.goto(`${protocol}://${domain}`, {
        waitUntil: "domcontentloaded",
        timeout: timeoutMs,
      });
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
