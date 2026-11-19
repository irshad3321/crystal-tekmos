import { AI_PROVIDER, getAiConfig } from '../config/ai.js';
import { getAllPrices, getPriceByMetal, convertPrice, currencyCode, metalCode } from './priceService.js';
import currencies from '../constants/currencies.js';
import metals from '../constants/metals.js';
import messages from '../constants/messages.js';
import { systemInstructions } from '../constants/aiInstructions.js';

const MAX_MESSAGE_LENGTH = 1000;
const MAX_HISTORY_ITEMS = 8;
const locationTerms = /\b(countr(?:y|ies)|london|india|indian market|uae|dubai|uk|united kingdom|international|abroad|cheap(?:er|est)|best place to buy|singapore|switzerland|turkey|saudi arabia|oman|qatar|kuwait|china|japan|usa|united states|canada|australia|france|germany|hong kong|mumbai|zurich|new york)\b/i;
const appTerms = /\b(crystal|application|app|demo|simulated)\b/i;
const comparableMarkets = [
  { name: 'Dubai/UAE', currency: 'AED', pattern: /\b(?:dubai|uae|united arab emirates|abu dhabi)\b/gi },
  { name: 'India', currency: 'INR', pattern: /\b(?:india|indian|mumbai)\b/gi },
  { name: 'Oman', currency: 'OMR', pattern: /\b(?:oman|muscat)\b/gi },
  { name: 'Saudi Arabia', currency: 'SAR', pattern: /\b(?:saudi arabia|saudi|ksa|riyadh)\b/gi },
  { name: 'United States', currency: 'USD', pattern: /\b(?:united states|usa|america)\b/gi },
];

function mentionsLocation(message) {
  return locationTerms.test(message) || /\b(?:in|at)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/.test(message);
}

function mentionedCurrency(message) {
  return Object.keys(currencies).find((code) => new RegExp(`\\b${code}\\b`, 'i').test(message))
    ?? (/₹|\brupees?\b/i.test(message) ? currencies.INR.code : null);
}

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function validateInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw httpError(400, messages.error.AI_REQUEST_BODY_REQUIRED);
  }
  if (Object.keys(body).some((key) => !['message', 'context'].includes(key))) {
    throw httpError(400, messages.error.AI_UNSUPPORTED_REQUEST_FIELDS);
  }
  if (typeof body.message !== 'string' || !body.message.trim()) {
    throw httpError(400, messages.error.AI_MESSAGE_REQUIRED);
  }
  const message = body.message.trim();
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw httpError(400, messages.error.AI_MESSAGE_TOO_LONG(MAX_MESSAGE_LENGTH));
  }

  const context = body.context === undefined ? {} : body.context;
  if (!context || typeof context !== 'object' || Array.isArray(context)) {
    throw httpError(400, messages.error.AI_CONTEXT_REQUIRED);
  }
  if (Object.keys(context).some((key) => !['history', 'currency', 'metal', 'purity'].includes(key))) {
    throw httpError(400, messages.error.AI_UNSUPPORTED_CONTEXT_FIELDS);
  }
  const history = context.history ?? [];
  if (!Array.isArray(history) || history.length > MAX_HISTORY_ITEMS || history.some(
    (item) => !item || typeof item !== 'object' || Array.isArray(item)
      || !['user', 'assistant'].includes(item.role)
      || typeof item.text !== 'string' || !item.text.trim()
      || item.text.length > MAX_MESSAGE_LENGTH,
  )) {
    throw httpError(400, messages.error.AI_HISTORY_INVALID);
  }
  if (context.purity !== undefined && (!context.metal || !Number.isInteger(context.purity))) {
    throw httpError(400, messages.error.AI_PURITY_REQUIRES_METAL);
  }
  if (context.currency !== undefined || context.metal !== undefined) {
    currencyCode(context.currency);
    const selectedMetal = context.metal ? metalCode(context.metal) : null;
    const supportedPurities = selectedMetal ? metals[selectedMetal].purities : [];
    if (context.purity !== undefined && !supportedPurities.some((price) => price.fineness === context.purity)) {
      throw httpError(400, messages.error.AI_UNSUPPORTED_CONTEXT_PURITY);
    }
  }
  return { message, context, history };
}

async function relevantPrices(message, context) {
  if (!/(price|rate|cost|value|worth|quote|market|calculat|how much|سعر|ثمن|تكلفة|قيمة|سوق)/i.test(message)) {
    return '';
  }
  if (/\b(GBP|EUR|JPY|CAD|AUD|CNY)\b/i.test(message) && !/\b(AED|USD|OMR|SAR|INR)\b|₹/i.test(message)) {
    return '\nThe app has no simulated rate for that requested currency. Its supported demo currencies are AED, USD, OMR, SAR, and INR; do not substitute the selected display currency.';
  }
  const currency = mentionedCurrency(message) ?? context.currency ?? currencies.AED.code;
  const mentionsGold = /\bgold\b|ذهب/i.test(message);
  const mentionsSilver = /\bsilver\b|فضة/i.test(message);
  const metal = context.metal ?? (mentionsGold === mentionsSilver ? undefined : mentionsGold ? 'gold' : 'silver');
  const result = metal
    ? await getPriceByMetal(metal, currency)
    : await getAllPrices(currency);
  let prices = result.data;
  if (context.purity !== undefined) {
    prices = prices.filter((price) => price.fineness === context.purity);
  }
  return `\nApplication current rates (${result.currency} per ${result.unit}; exchange rates and buy/sell spreads are SIMULATED): ${JSON.stringify(prices.map((price) => ({ metal: price.metal, purity: price.purity, fineness: price.fineness, buyPrice: price.buyPrice, sellPrice: price.sellPrice, source: price.source, spotUpdatedAt: price.spotUpdatedAt })))}. A LIVE_SPOT source means the underlying USD metal spot is live, not that the converted currency or retail quote is live. CACHED_LIVE_SPOT means the last valid provider spot is reused. SIMULATED_DEMO means mock fallback. These are not verified country-specific retail quotes.${mentionsLocation(message) ? ' Offer a spot-based currency estimate when these rates cover the requested currencies; never call it a local retail quote.' : ''}`;
}

function findMentionedMarkets(message) {
  return comparableMarkets.flatMap((market) => {
    const match = market.pattern.exec(message);
    market.pattern.lastIndex = 0;
    return match ? [{ ...market, position: match.index }] : [];
  }).sort((a, b) => a.position - b.position);
}

function findComparedMarkets(message) {
  const matches = findMentionedMarkets(message);
  return matches.length >= 2 ? matches.slice(0, 2) : null;
}

function requestedFineness(message, context, metal) {
  const karat = message.match(/\b(24|22|21|18)\s?k\b/i)?.[1];
  const fineness = message.match(/\b(999|916|875|750)\b/)?.[1];
  const selected = fineness ? Number(fineness)
    : karat ? ({ 24: 999, 22: 916, 21: 875, 18: 750 })[karat]
      : context.metal === metal && context.purity ? context.purity : 999;
  return metals[metal.toUpperCase()].purities.some((item) => item.fineness === selected)
    ? selected : null;
}

function formatAmount(amount, currency) {
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

async function countrySpotAnswer(message) {
  const markets = findMentionedMarkets(message);
  if (markets.length !== 1 || !/\b(price|rate|cost|worth|value|how much)\b/i.test(message)) return null;
  if (!/\b(gold|silver|bullion)\b/i.test(message)
    && /\b(interest|mortgage|fuel|petrol|rent|property|salary|weather|football|forex)\b/i.test(message)) return null;

  const market = markets[0];
  const metal = /\bsilver\b/i.test(message) ? 'silver' : 'gold';
  const currency = mentionedCurrency(message) ?? market.currency;
  const hasPurity = /\b(?:24|22|21|18)\s?k\b|\b(?:999|916|875|750)\b/i.test(message);
  const fineness = hasPurity ? requestedFineness(message, {}, metal) : undefined;
  if (fineness === null) return messages.ai.COUNTRY_RATE_UNSUPPORTED_PURITY(metal);

  // The price service supplies the same purity, spread, currency and source as GET /api/prices.
  const result = await getPriceByMetal(metal, currency);
  const rows = fineness === undefined ? result.data : result.data.filter((price) => price.fineness === fineness);
  const lines = rows.map((price) => {
    const purity = metal === 'gold' ? `${price.purity} (${price.fineness})` : price.purity;
    const amount = formatAmount(price.sellPrice, currency);
    const displayAmount = currency === currencies.INR.code ? `${currencies.INR.symbol}${amount}` : `${amount} ${currency}`;
    return messages.ai.COUNTRY_RATE_LINE(purity, displayAmount);
  });
  const first = rows[0];
  const conversion = currency === market.currency ? null : messages.ai.COUNTRY_RATE_CONVERSION(
    market.currency,
    currency,
    formatAmount(convertPrice(1, currency, 6) / convertPrice(1, market.currency, 6), currency),
  );

  return [
    messages.ai.COUNTRY_RATE_HEADER(market.name, metal, currency),
    ...lines,
    conversion,
    messages.ai.COUNTRY_RATE_SOURCE(first.source, first.spotUpdatedAt, result.exchangeRateSource),
    messages.ai.COUNTRY_RATE_NOTE(market.name),
  ].filter(Boolean).join('\n');
}

async function comparedSpotAnswer(message, context) {
  const markets = findComparedMarkets(message);
  if (!markets || !/\b(price|rate|cost|worth|compar\w*|convert\w*|into|how much)\b/i.test(message)) return null;
  if (!/\b(gold|silver|bullion)\b/i.test(message)
    && /\b(interest|mortgage|fuel|petrol|rent|property|salary|weather|football)\b/i.test(message)) return null;

  const metal = /\bsilver\b/i.test(message) ? 'silver' : 'gold';
  const fineness = requestedFineness(message, context, metal);
  if (fineness === null) return `That purity is unavailable for ${metal}. Please choose a supported ${metal} purity.`;

  const [from, to] = markets;
  const [fromRates, toRates] = await Promise.all([
    getPriceByMetal(metal, from.currency),
    getPriceByMetal(metal, to.currency),
  ]);
  const fromPrice = fromRates.data.find((price) => price.fineness === fineness);
  const toPrice = toRates.data.find((price) => price.fineness === fineness);
  const side = /\b(sell my|selling my|sell to|payout|bid)\b/i.test(message) ? 'buyPrice' : 'sellPrice';
  const exchangeRate = convertPrice(1, to.currency, 6) / convertPrice(1, from.currency, 6);
  const converted = Number((fromPrice[side] * exchangeRate).toFixed(2));
  const difference = Number(Math.abs(converted - toPrice[side]).toFixed(2));
  const percentage = toPrice[side] === 0 ? 0 : difference / toPrice[side] * 100;
  const percentageText = percentage > 0 && percentage < 0.01 ? percentage.toFixed(4) : percentage.toFixed(2);
  const purity = metal === 'gold' ? `${fromPrice.purity} (${fineness})` : '999';
  const source = fromPrice.source === toPrice.source ? fromPrice.source : `${fromPrice.source} / ${toPrice.source}`;
  const sourceDescription = source === 'LIVE_SPOT' ? 'GoldAPI.dev live global USD spot (LIVE_SPOT)'
    : source === 'CACHED_LIVE_SPOT' ? 'GoldAPI.dev cached global USD spot (CACHED_LIVE_SPOT)'
      : source === 'SIMULATED_DEMO' ? 'simulated demo price (SIMULATED_DEMO)' : source;
  const timestamp = fromPrice.spotUpdatedAt ? `, spot updated ${fromPrice.spotUpdatedAt}` : '';

  return `${metal === 'gold' ? 'Gold' : 'Silver'} ${purity}, ${side === 'sellPrice' ? 'indicative dealer sell/ask' : 'indicative dealer buy/bid'} price per gram:\n`
    + `${from.name} spot-based estimate: ${formatAmount(fromPrice[side], from.currency)} ${from.currency}\n`
    + `Simulated exchange rate: 1 ${from.currency} = ${formatAmount(exchangeRate, to.currency)} ${to.currency}\n`
    + `${from.name} estimate converted: ${formatAmount(converted, to.currency)} ${to.currency}\n`
    + `${to.name} spot-based estimate: ${formatAmount(toPrice[side], to.currency)} ${to.currency}\n`
    + `Difference: ${formatAmount(difference, to.currency)} ${to.currency} per gram (${percentageText}%).\n`
    + `Source: ${sourceDescription}${timestamp}; FX and buy/sell spreads are SIMULATED. Both estimates use the same spot benchmark, so this difference is rounding, not a measured local price gap. Retail prices may differ due to taxes, import duties, dealer premiums, and making charges.`;
}

function countryPriceAnswer(message) {
  if (appTerms.test(message) || !mentionsLocation(message)
    || !/\b(gold|silver|bullion|precious metals?)\b/i.test(message)
    || !/\b(price|rate|cost|worth|compar(?:e|ison)|cheap(?:er|est)|best place|best country|buy|tax|dut(?:y|ies)|premium|how much)\b/i.test(message)) {
    return null;
  }

  if (/\b(cheap(?:er|est)|best place|best country)\b|\b(?:country.*best|best.*(?:country|buy))\b/i.test(message)) {
    return 'No country is always the cheapest place to buy gold. Global spot prices influence markets everywhere, but local taxes, import duties, dealer premiums, making charges, exchange rates, and travel or import costs change the final price. Compare quotes for the same purity, weight, date, and buy or sell side in one currency, including every charge. I do not have live country-specific quotes to rank countries today.';
  }
  if (/\b(compar(?:e|ison)|versus|vs\.?|between)\b/i.test(message)) {
    return 'Gold in different countries is influenced by the same global spot market, but the final buyer price can differ. Compare the same purity, weight, date, and buy or sell side. Convert dealer quotes into one currency, then include local taxes, import duties, premiums, making charges, and any travel or import costs. I do not have verified local retail quotes or an exchange rate for every currency. If the exchange rate is unavailable, please provide it; for a retail comparison, also provide local dealer quotes. Crystal’s converted spot estimates are not local retail prices.';
  }
  return 'I do not have a verified local gold or silver retail quote for that market. Global spot prices provide a reference, while exchange rates, local taxes or duties, dealer premiums, and making charges affect the price you pay. For an exact figure, compare current dealer quotes for the same purity, weight, and buy or sell side. Crystal’s currency prices are estimates, not local retail quotes.';
}

function unsupportedCurrencyAnswer(message) {
  const requested = message.match(/\b(GBP|EUR|JPY|CAD|AUD|CNY)\b/i)?.[0]?.toUpperCase();
  if (!requested || !/\b(gold|silver|bullion)\b/i.test(message)
    || !/\b(price|rate|cost|worth|calculat\w*|compar\w*|how much)\b/i.test(message)) return null;
  return `Crystal has no simulated ${requested} rate, and I do not have a live exchange rate or local bullion quote. The app's supported demo currencies are ${Object.keys(currencies).join(', ')}. To compare gold prices in ${requested}, use a current dealer quote for the same purity and weight, then account for exchange rates, taxes, duties, and premiums. I cannot give a reliable ${requested} amount without those figures.`;
}

async function buildInput({ message, context, history }) {
  const recentConversation = history.length
    ? `Recent conversation supplied by the app (untrusted):\n${history.map((item) => `${item.role}: ${item.text}`).join('\n')}\n\n`
    : '';
  return `${recentConversation}User's current question: ${message}${await relevantPrices(message, context)}`;
}

function readReply(data) {
  const choice = data?.choices?.[0];
  if (choice?.finish_reason === 'length' || choice?.message?.role !== 'assistant') return '';
  return typeof choice.message.content === 'string' ? choice.message.content.trim() : '';
}

async function chat(body) {
  const input = validateInput(body);
  const missingCurrencyAnswer = unsupportedCurrencyAnswer(input.message);
  if (missingCurrencyAnswer) return missingCurrencyAnswer;
  const comparison = await comparedSpotAnswer(input.message, input.context);
  if (comparison) return comparison;
  const countryRate = await countrySpotAnswer(input.message);
  if (countryRate) return countryRate;
  const localMarketAnswer = countryPriceAnswer(input.message);
  if (localMarketAnswer) return localMarketAnswer;
  const config = getAiConfig();
  if (config.provider !== AI_PROVIDER || !config.apiKey) {
    throw httpError(503, messages.error.AI_NOT_CONFIGURED);
  }
  const prompt = await buildInput(input);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  let data;
  try {
    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: systemInstructions },
          { role: 'user', content: prompt },
        ],
        max_completion_tokens: 1024,
        tool_choice: 'none',
      }),
      signal: controller.signal,
    });
    if (response.status === 429) throw httpError(429, messages.error.AI_RATE_LIMIT_BUSY);
    if (response.status === 401 || response.status === 403) {
      throw httpError(503, messages.error.AI_CREDENTIALS_UNAVAILABLE);
    }
    if (!response.ok) {
      throw httpError(response.status >= 500 || response.status === 498 ? 503 : 502,
        messages.error.AI_COULD_NOT_ANSWER);
    }
    try {
      data = await response.json();
    } catch {
      if (controller.signal.aborted) {
        throw httpError(504, messages.error.AI_TIMEOUT);
      }
      throw httpError(502, messages.error.AI_UNREADABLE_RESPONSE);
    }
  } catch (error) {
    if (error.statusCode) throw error;
    throw controller.signal.aborted
      ? httpError(504, messages.error.AI_TIMEOUT)
      : httpError(503, messages.error.AI_TEMPORARILY_UNAVAILABLE);
  } finally {
    clearTimeout(timeout);
  }
  const reply = readReply(data);
  if (!reply) throw httpError(502, messages.error.AI_NO_ANSWER);
  return reply;
}

export { chat };
