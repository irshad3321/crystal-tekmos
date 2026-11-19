import type { MetalRate } from '@/constants/mockRates';

export type WeightUnit = 'Gram' | 'Tola' | 'Ounce' | 'KG' | 'TTB';

export const weightUnits: readonly WeightUnit[] = ['Gram', 'Tola', 'Ounce', 'KG', 'TTB'];

export const gramsPerUnit: Record<WeightUnit, number> = {
  Gram: 1,
  Tola: 11.6638,
  Ounce: 31.1035,
  KG: 1000,
  TTB: 116.638,
};

export function calculateBullionTotal(weightText: string, unit: WeightUnit, rate: Pick<MetalRate, 'ask'>, includeVat: boolean) {
  const normalized = weightText.trim().replace(',', '.');
  if (!/^\d+(\.\d*)?$/.test(normalized)) {
    return { total: null, error: 'Enter a valid numeric weight.' };
  }

  const weight = Number(normalized);
  if (!Number.isFinite(weight) || weight <= 0) {
    return { total: null, error: 'Weight must be greater than zero.' };
  }

  const total = weight * gramsPerUnit[unit] * Number(rate.ask) * (includeVat ? 1.05 : 1);
  if (!Number.isFinite(total)) {
    return { total: null, error: 'Enter a smaller weight.' };
  }

  return { total, error: null };
}
