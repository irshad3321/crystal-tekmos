import type { MetalRate } from '@/constants/mockRates';

export type GraphPeriod = '1D' | '1W' | '1M' | '1Y';

export const graphPeriods: readonly GraphPeriod[] = ['1D', '1W', '1M', '1Y'];

// Illustrative movement only. These points are not recorded market prices.
const movement: Record<GraphPeriod, readonly number[]> = {
  '1D': [-0.38, -0.22, -0.31, -0.08, 0.12, 0.04, 0.34, 0.21, 0.48, 0.29, 0.55, 0.41, 0],
  '1W': [-0.7, -0.54, -0.65, -0.24, -0.37, 0.02, -0.13, 0.22, 0.08, 0.38, 0.25, 0.51, 0],
  '1M': [-1.15, -0.91, -1.03, -0.62, -0.73, -0.21, -0.45, 0.09, -0.12, 0.38, 0.2, 0.54, 0],
  '1Y': [-2.5, -2.08, -2.24, -1.7, -1.85, -1.33, -1.52, -0.82, -1.02, -0.41, -0.63, 0.23, 0],
};

const periodScale: Record<GraphPeriod, number> = { '1D': 0.6, '1W': 0.95, '1M': 1.2, '1Y': 1.55 };

export function getMockHistory(rate: MetalRate, period: GraphPeriod): number[] {
  const ask = Number(rate.ask);
  const dayRange = Number(rate.high) - Number(rate.low);
  const scale = dayRange * periodScale[period];

  return movement[period].map((offset, index, points) => {
    if (index === points.length - 1) return ask;
    // Intraday points stay inside the low/high values shown on the rate card.
    const intradayDistance = offset < 0 ? ask - Number(rate.low) : Number(rate.high) - ask;
    const movementAmount = period === '1D' ? offset * intradayDistance : offset * scale;
    return Number((ask + movementAmount).toFixed(2));
  });
}
