export const TROY_OUNCE_IN_GRAMS = 31.1034768;

export const spotPriceUnits = ['Per Gram', 'Per Oz'] as const;
export type SpotPriceUnit = (typeof spotPriceUnits)[number];

export function spotPriceForUnit(pricePerGram: string | number, unit: SpotPriceUnit): number {
  const price = Number(pricePerGram);
  return unit === 'Per Oz' ? price * TROY_OUNCE_IN_GRAMS : price;
}
