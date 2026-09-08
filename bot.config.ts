export const botConfig = {
  scenariosDirectory: './scenarios',
  aiFallbackEnabled: true,
  aiCachePath: './.ai-cache/locators.json',
  visualMaskSelectors: ['img', '.price', '.dynamic-cart-count', 'iframe'],
  lighthouseThresholds: {
    performance: 50,
    accessibility: 80
  }
} as const;

export default botConfig;
