import { defineConfig } from '@playwright/test';
import botConfig from './bot.config';

const { visualMaskSelectors } = botConfig;

export default defineConfig({
  testDir: './tests',
  reporter: [['allure-playwright'], ['json', { outputFile: 'results.json' }]],
  use: {
    baseURL: process.env.MERCHANT_URL,
    proxy: process.env.HTTP_PROXY ? { server: process.env.HTTP_PROXY } : undefined,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css'
    }
  },
  metadata: {
    visualMaskSelectors
  }
});
