import { COPY } from '@/constants/copy';
export type MetalRate = {
  id: string;
  title: string;
  subtitle: string;
  purity: string;
  ask: string;
  bid: string;
  low: string;
  high: string;
  metal: 'gold' | 'silver';
};

// Display fixtures for the first UI pass. These are not live market rates.
export const mockRates: MetalRate[] = [
  { id: 'gold-24k', title: COPY.GOLD_24K, subtitle: COPY.PURE_999_9, purity: '999.9', ask: '496.20', bid: '493.85', low: '489.40', high: '498.10', metal: 'gold' },
  { id: 'gold-22k', title: COPY.GOLD_22K, subtitle: COPY.JEWELLERY_STANDARD, purity: '916', ask: '454.85', bid: '452.70', low: '448.63', high: '456.59', metal: 'gold' },
  { id: 'gold-21k', title: COPY.GOLD_21K, subtitle: COPY.ARAB_STANDARD, purity: '875', ask: '434.18', bid: '432.12', low: '428.24', high: '435.84', metal: 'gold' },
  { id: 'gold-18k', title: COPY.GOLD_18K, subtitle: COPY.FASHION_STANDARD, purity: '750', ask: '372.15', bid: '370.39', low: '367.05', high: '373.58', metal: 'gold' },
  { id: 'silver-999', title: COPY.SILVER_999, subtitle: COPY.PURE_BULLION, purity: '999', ask: '5.98', bid: '5.82', low: '5.71', high: '6.04', metal: 'silver' },
];
