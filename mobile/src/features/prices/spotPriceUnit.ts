import { COPY } from '@/constants/copy';
export const TROY_OUNCE_IN_GRAMS = 31.1034768;

export const spotPriceUnits = [COPY.PER_GRAM, COPY.PER_OZ] as const;
export type SpotPriceUnit = (typeof spotPriceUnits)[number];

export function spotPriceForUnit(pricePerGram: string | number, unit: SpotPriceUnit): number {
  const price = Number(pricePerGram);
  return unit === COPY.PER_OZ ? price * TROY_OUNCE_IN_GRAMS : price;
}
