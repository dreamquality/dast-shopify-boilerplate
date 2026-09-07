# Autonomous QA, Security & Performance Bot Boilerplate

This repository provides a plug-and-play, data-driven pipeline for Shopify app quality engineering with AI-driven testing, DAST scanning, performance audits, and unified reporting.

## Architecture Overview (Hybrid AI + DAST)

- **Playwright Runner** executes YAML-defined journeys from `scenarios/`.
- **Midscene AI + Cache** resolves uncertain actions once, then stores stable selectors in `.ai-cache/locators.json`.
- **OWASP ZAP Proxy** runs in daemon mode and routes traffic through `HTTP_PROXY` for DAST visibility.
- **Lighthouse Audits** enforce baseline web-vital style quality gates.
- **Allure Reporting** consolidates outputs from sharded matrix runs.

## Smart Visual Masking

Visual regression checks mask dynamic content to reduce flaky snapshots:

- Masked selectors are defined in `bot.config.ts` under `visualMaskSelectors`.
- Default masks ignore images, prices, dynamic cart badges, and iframes.
- `visual-check` steps in YAML use these masks via `expect(page).toHaveScreenshot(...)`.

## Lighthouse Integration

Use `audit-performance` steps in YAML to run `playwright-lighthouse` against current pages.
Thresholds are centrally managed in `bot.config.ts` (`lighthouseThresholds`) so teams can prevent app changes from degrading store performance or accessibility.

## Smart Alert Grouping

`scripts/smart-alert-grouping.js` parses `results.json`, groups failures by shared error signature, and outputs one master ticket payload per unique failure pattern.
This prevents alert fatigue by aggregating impacted merchant URLs into grouped incidents instead of one ticket per failing merchant.

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure secrets:
   ```bash
   ./setup.sh
   ```
3. Run security proxy:
   ```bash
   npm run zap:up
   ```
4. Execute tests:
   ```bash
   npm test
   ```
5. Generate report:
   ```bash
   npm run report:generate
   ```
