import currencies from '../constants/currencies.js';
import metals from '../constants/metals.js';
import messages from '../constants/messages.js';

// AED per gram. Edit these values to change the demo prices.
const mockPriceValues = Object.freeze({
  [metals.GOLD.code]: Object.freeze({
    '24K': Object.freeze({ buyPrice: 493.85, sellPrice: 496.20 }),
    '22K': Object.freeze({ buyPrice: 452.70, sellPrice: 454.85 }),
    '21K': Object.freeze({ buyPrice: 432.12, sellPrice: 434.18 }),
    '18K': Object.freeze({ buyPrice: 370.39, sellPrice: 372.15 }),
  }),
  [metals.SILVER.code]: Object.freeze({
    '999': Object.freeze({ buyPrice: 5.82, sellPrice: 5.98 }),
  }),
});

const mockPrices = Object.freeze(Object.values(metals).flatMap((metal) =>
  metal.purities.map((purity) => {
    const values = mockPriceValues[metal.code]?.[purity.label];
    if (!values) throw new Error(messages.error.MISSING_MOCK_PRICE(metal.code, purity.label));

    return Object.freeze({
      metal: metal.code.toLowerCase(),
      purity: purity.label,
      fineness: purity.fineness,
      buyPrice: values.buyPrice,
      sellPrice: values.sellPrice,
      currency: currencies.AED.code,
      unit: 'gram',
      source: 'SIMULATED_DEMO',
    });
  }),
));

export default mockPrices;
