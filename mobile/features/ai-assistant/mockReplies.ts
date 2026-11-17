export const welcomeMessage = "Hello! I'm Crystal AI.\n\nI can help you calculate gold and silver prices, understand market movements, compare gold purities and manage price alerts.\n\nWhat would you like to explore today?";

export const quickActions = [
  { label: 'Calculate Gold Price', prompt: 'How can I calculate a gold price?' },
  { label: 'Calculate Silver Price', prompt: 'How can I calculate a silver price?' },
  { label: 'Compare Gold Purities', prompt: 'What is the difference between 24K, 22K, 21K and 18K gold?' },
  { label: 'Explain Price Changes', prompt: 'How should I read the price graph?' },
  { label: 'Set Price Alert', prompt: 'How do I set a price alert?' },
  { label: 'Help Me Use Crystal', prompt: 'What can I do in the Crystal app?' },
] as const;

const demoAnswers: Record<string, string> = {
  [quickActions[0].prompt]: 'Open the Bullion Calculator on the dashboard. Choose a gold purity, enter a weight, select Gram, Tola, Ounce, KG or TTB, and switch UAE VAT on or off. The estimate uses the displayed mock ASK rate.',
  [quickActions[1].prompt]: 'Open the Bullion Calculator on the dashboard, select Silver 999, then enter a weight and unit. The estimate uses the displayed mock silver ASK rate.',
  [quickActions[2].prompt]: 'Crystal shows separate rate cards for 24K (999.9), 22K (916), 21K (875) and 18K (750). Select each card to compare its displayed ASK, BID and price graph. All prices in this demo are mock data.',
  [quickActions[3].prompt]: 'Tap a gold or silver rate card to select its graph. Use 1D, 1W, 1M or 1Y to change the illustrative period. The graph also shows the 24-hour change, low, high and volatility.',
  [quickActions[4].prompt]: 'Scroll to Price Target Alarms on the dashboard. Choose a metal, enter a target ASK price in AED per gram and tap Set Alert. Saved targets show Waiting or Target Reached against mock prices.',
  [quickActions[5].prompt]: 'The dashboard contains bullion rate cards, a price graph, a bullion calculator and price target alarms. This Crystal AI chat is a frontend demo with preset replies only.',
};

export function getMockReply(prompt: string): string {
  const originalPrompt = quickActions.find(action => ar[action.prompt] === prompt)?.prompt ?? prompt;
  return demoAnswers[originalPrompt] ?? 'This is a Crystal AI interface demo, so I cannot answer custom questions yet. Try one of the suggested topics or explore the rate cards, graph, calculator and price alerts on the dashboard.';
}
import { ar } from '@/constants/translations';

