import fs from 'node:fs';
import path from 'node:path';
import { expect, test, chromium } from '@playwright/test';
import { playAudit } from 'playwright-lighthouse';
import YAML from 'yaml';
import botConfig from '../bot.config';

type ScenarioStep = {
  action: string;
  target?: string;
  prompt?: string;
  name?: string;
};

type ScenarioFile = {
  name?: string;
  merchant_url?: string;
  steps: ScenarioStep[];
};

type AiCache = Record<string, string>;

const cachePath = path.resolve(botConfig.aiCachePath);
const scenarioDir = path.resolve(botConfig.scenariosDirectory);

function loadAiCache(): AiCache {
  if (!fs.existsSync(cachePath)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(cachePath, 'utf-8')) as AiCache;
  } catch {
    return {};
  }
}

function saveAiCache(cache: AiCache): void {
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  const tempPath = `${cachePath}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(cache, null, 2), 'utf-8');
  fs.renameSync(tempPath, cachePath);
}

function interpolateEnv(value?: string): string {
  if (!value) {
    return '';
  }

  return value.replace(/\$\{([A-Z0-9_]+)\}/g, (_, name: string) => process.env[name] ?? '');
}

async function resolveAndRunAiAction(page: any, prompt: string): Promise<void> {
  const cache = loadAiCache();
  const cachedSelector = cache[prompt];

  if (cachedSelector) {
    await page.locator(cachedSelector).first().click();
    return;
  }

  if (!botConfig.aiFallbackEnabled) {
    throw new Error(`No cached selector for prompt: ${prompt}`);
  }

  const midscene = await import('@midscene/playwright').catch(() => undefined);
  const aiFn = (midscene as any)?.ai as ((input: string, p: any) => Promise<any>) | undefined;

  if (!aiFn) {
    throw new Error('AI fallback requested but @midscene/playwright ai() is unavailable.');
  }

  const result = await aiFn(prompt, page);
  const selector = typeof result === 'string' ? result : result?.selector;

  if (!selector) {
    throw new Error(`AI fallback did not return a selector for prompt: ${prompt}`);
  }

  cache[prompt] = selector;
  saveAiCache(cache);
  await page.locator(selector).first().click();
}

const scenarioFiles = fs
  .readdirSync(scenarioDir)
  .filter((file) => file.endsWith('.yaml') || file.endsWith('.yml'));

for (const scenarioFile of scenarioFiles) {
  test(`scenario: ${scenarioFile}`, async ({ page, browserName }, testInfo) => {
    const parsed = YAML.parse(
      fs.readFileSync(path.join(scenarioDir, scenarioFile), 'utf8')
    ) as ScenarioFile;

    const merchantUrl = interpolateEnv(parsed.merchant_url || process.env.MERCHANT_URL).replace(/\/$/, '');
    if (!merchantUrl) {
      throw new Error('MERCHANT_URL is required in scenario file or environment.');
    }
    await testInfo.attach('merchant_url', {
      body: merchantUrl,
      contentType: 'text/plain'
    });

    for (const step of parsed.steps || []) {
      switch (step.action) {
        case 'navigate': {
          await page.goto(`${merchantUrl}${step.target ?? ''}`);
          break;
        }
        case 'ai-action': {
          if (!step.prompt) {
            throw new Error('ai-action requires a prompt');
          }
          await resolveAndRunAiAction(page, step.prompt);
          break;
        }
        case 'visual-check': {
          const screenshotName = `${step.name ?? 'visual-check'}-${browserName}.png`;
          const mask = botConfig.visualMaskSelectors.map((selector) => page.locator(selector));
          await expect(page).toHaveScreenshot(screenshotName, { mask });
          break;
        }
        case 'audit-performance': {
          const auditPort = 9222 + testInfo.parallelIndex;
          const auditBrowser = await chromium.launch({
            args: [`--remote-debugging-port=${auditPort}`],
            proxy: process.env.HTTP_PROXY ? { server: process.env.HTTP_PROXY } : undefined
          });

          try {
            const storageState = await page.context().storageState();
            const auditContext = await auditBrowser.newContext({ storageState });
            const auditPage = await auditContext.newPage();
            await auditPage.goto(page.url());
            await playAudit({
              page: auditPage,
              port: auditPort,
              thresholds: botConfig.lighthouseThresholds
            });
            await auditContext.close();
          } finally {
            await auditBrowser.close();
          }
          break;
        }
        default:
          throw new Error(`Unsupported action: ${step.action}`);
      }
    }
  });
}
