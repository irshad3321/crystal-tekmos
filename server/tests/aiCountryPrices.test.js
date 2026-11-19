import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import { chat } from '../src/services/aiService.js';
import { convertPrice, getPriceByMetal } from '../src/services/priceService.js';

const originalGoldKey = process.env.GOLD_API_KEY;
const originalGroqKey = process.env.GROQ_API_KEY;
const originalFetch = globalThis.fetch;

function displayPrice(price, currency) {
  const amount = new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
  return currency === 'INR' ? `₹${amount}` : `${amount} ${currency}`;
}

test('Goldyy uses app prices for country questions and currency comparisons', async (t) => {
  process.env.GOLD_API_KEY = '';
  process.env.GROQ_API_KEY = '';
  try {
    await t.test('Indian rate includes all supported purities in INR despite AED app context', async () => {
      const reply = await chat({ message: 'What is Indian rate?', context: { currency: 'AED' } });
      const prices = await getPriceByMetal('gold', 'INR');
      assert.match(reply, /India gold selling\/ask rates \(INR per gram\)/);
      for (const price of prices.data) {
        assert.ok(reply.includes(`${price.purity} (${price.fineness}): ${displayPrice(price.sellPrice, 'INR')}`));
      }
      assert.match(reply, /Source: SIMULATED_DEMO/);
      assert.match(reply, /not verified India retail rates/);
      assert.equal((await chat({ message: 'Today Indian rate of gold' })).includes(displayPrice(prices.data[0].sellPrice, 'INR')), true);
    });

    await t.test('explicit purity selects the matching price only', async () => {
      const reply = await chat({ message: 'What is 22K gold price in India?' });
      const price = (await getPriceByMetal('gold', 'INR')).data.find((row) => row.fineness === 916);
      assert.ok(reply.includes(`22K (916): ${displayPrice(price.sellPrice, 'INR')}`));
      assert.doesNotMatch(reply, /24K \(999\):/);
    });

    await t.test('Dubai rate in INR honors requested currency and uses simulated AED to INR conversion', async () => {
      const reply = await chat({ message: 'Dubai gold rate in INR?' });
      const price = (await getPriceByMetal('gold', 'INR')).data[0];
      const exchangeRate = convertPrice(1, 'INR', 6) / convertPrice(1, 'AED', 6);
      assert.ok(reply.includes(`24K (999): ${displayPrice(price.sellPrice, 'INR')}`));
      assert.ok(reply.includes(`1 AED ≈ ${displayPrice(exchangeRate, 'INR').replace('₹', '')} INR (simulated FX)`));
      assert.match(reply, /not verified Dubai\/UAE retail rates/);
    });

    await t.test('all requested markets map to the existing currencies', async () => {
      for (const [market, currency] of [
        ['India', 'INR'], ['Dubai', 'AED'], ['Oman', 'OMR'], ['Saudi Arabia', 'SAR'], ['USA', 'USD'],
      ]) {
        const reply = await chat({ message: `What is the gold rate in ${market}?` });
        const price = (await getPriceByMetal('gold', currency)).data[0];
        assert.ok(reply.includes(`(${currency} per gram)`));
        assert.ok(reply.includes(displayPrice(price.sellPrice, currency)));
      }
    });

    await t.test('Indian silver rate uses the existing silver 999 price', async () => {
      const reply = await chat({ message: 'What is the silver rate in India?' });
      const silver = (await getPriceByMetal('silver', 'INR')).data[0];
      assert.ok(reply.includes(`999: ${displayPrice(silver.sellPrice, 'INR')}`));
      assert.doesNotMatch(reply, /24K \(999\)/);
    });

    await t.test('comparison uses 22K on both sides and existing exchange rate', async () => {
      const reply = await chat({ message: 'Compare 22K gold prices in Dubai and India' });
      const dubai = (await getPriceByMetal('gold', 'AED')).data.find((row) => row.fineness === 916);
      const india = (await getPriceByMetal('gold', 'INR')).data.find((row) => row.fineness === 916);
      const rate = convertPrice(1, 'INR', 6) / convertPrice(1, 'AED', 6);
      const converted = Number((dubai.sellPrice * rate).toFixed(2));
      const difference = Number(Math.abs(converted - india.sellPrice).toFixed(2));
      assert.match(reply, /Gold 22K \(916\)/);
      assert.ok(reply.includes(`Dubai/UAE estimate converted: ${displayPrice(converted, 'INR').replace('₹', '')}`));
      assert.ok(reply.includes(`India spot-based estimate: ${displayPrice(india.sellPrice, 'INR').replace('₹', '')}`));
      assert.ok(reply.includes(`Difference: ${displayPrice(difference, 'INR').replace('₹', '')}`));
      assert.match(reply, /same spot benchmark/);
    });

    await t.test('unsupported currencies are not silently replaced', async () => {
      const reply = await chat({ message: 'What is the gold rate in India in GBP?' });
      assert.match(reply, /no simulated GBP rate/i);
      assert.doesNotMatch(reply, /India gold selling\/ask rates/);
    });

    await t.test('existing HTTP contract returns a country answer and validates input', async () => {
      const server = app.listen(0, '127.0.0.1');
      try {
        await new Promise((resolve, reject) => {
          server.once('listening', resolve);
          server.once('error', reject);
        });
        const address = server.address();
        const url = `http://127.0.0.1:${address.port}/api/ai/chat`;
        const response = await originalFetch(url, {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ message: 'What is 22K gold price in India?' }),
        });
        const body = await response.json();
        assert.equal(response.status, 200);
        assert.equal(body.success, true);
        assert.match(body.reply, /22K \(916\)/);

        const invalid = await originalFetch(url, {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ message: '' }),
        });
        assert.equal(invalid.status, 400);
        assert.equal((await invalid.json()).success, false);
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    });

    await t.test('mocked provider data reports live and cached quote status without retail claims', async () => {
      const quoteTime = '2026-11-19T10:00:00.000Z';
      let providerCalls = 0;
      process.env.GOLD_API_KEY = 'test-key-for-mocked-provider';
      globalThis.fetch = async (url) => {
        providerCalls += 1;
        const gold = String(url).includes('/XAU/');
        return {
          ok: true,
          json: async () => ({
            symbol: gold ? 'XAU' : 'XAG', currency: 'USD', unit: 'oz',
            price: gold ? 3110.34768 : 31.1034768,
            gram: gold ? 100 : 1,
            ...(gold ? { karat: 24 } : {}),
            updatedAt: quoteTime,
          }),
        };
      };
      const live = await chat({ message: 'Today Indian rate of gold' });
      const cached = await chat({ message: 'Today Indian rate of gold' });
      assert.match(live, /Source: LIVE_SPOT; spot quote 2026-11-19T10:00:00\.000Z/);
      assert.match(cached, /Source: CACHED_LIVE_SPOT; spot quote 2026-11-19T10:00:00\.000Z/);
      assert.match(live, /Exchange rates: SIMULATED_DEMO/);
      assert.match(live, /not verified India retail rates/);
      assert.equal(providerCalls, 2);
    });
  } finally {
    globalThis.fetch = originalFetch;
    if (originalGoldKey === undefined) delete process.env.GOLD_API_KEY;
    else process.env.GOLD_API_KEY = originalGoldKey;
    if (originalGroqKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = originalGroqKey;
  }
});
