const AI_PROVIDER = 'groq';
const DEFAULT_MODEL = 'openai/gpt-oss-20b';
const PROVIDER_URL = 'https://api.groq.com/openai/v1/chat/completions';
const PROVIDER_TIMEOUT_MS = 25000;

function getAiConfig() {
  const requestedTimeout = Number(process.env.AI_TIMEOUT_MS);
  return {
    provider: process.env.AI_PROVIDER?.trim().toLowerCase() || AI_PROVIDER,
    model: process.env.GROQ_MODEL?.trim() || DEFAULT_MODEL,
    apiKey: process.env.GROQ_API_KEY?.trim(),
    url: PROVIDER_URL,
    timeoutMs: Number.isInteger(requestedTimeout) && requestedTimeout >= 1000 && requestedTimeout <= 30000
      ? requestedTimeout
      : PROVIDER_TIMEOUT_MS,
  };
}

export { AI_PROVIDER, getAiConfig };
