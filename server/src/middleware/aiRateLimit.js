import messages from '../constants/messages.js';

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;
const requests = new Map();

function aiRateLimit(req, res, next) {
  const now = Date.now();
  const key = req.ip;
  if (requests.size >= 1000) {
    for (const [address, entry] of requests) {
      if (now >= entry.resetAt) requests.delete(address);
    }
  }
  const entry = requests.get(key);
  if (!entry && requests.size >= 1000) {
    const error = new Error(messages.error.AI_RATE_LIMIT_BUSY);
    error.statusCode = 429;
    return next(error);
  }
  const current = !entry || now >= entry.resetAt ? { count: 0, resetAt: now + WINDOW_MS } : entry;
  current.count += 1;
  requests.set(key, current);
  if (current.count > MAX_REQUESTS) {
    res.set('Retry-After', String(Math.ceil((current.resetAt - now) / 1000)));
    const error = new Error(messages.error.AI_RATE_LIMIT_EXCEEDED);
    error.statusCode = 429;
    return next(error);
  }
  return next();
}

export { aiRateLimit };
